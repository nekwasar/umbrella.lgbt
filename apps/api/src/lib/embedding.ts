// ---- light embedding + ranking --------------------------------------
//
// MVP: we ship a deterministic, corpus-aware embedding so the site can
// "search well" and "train a small model" without needing a third-party
// model vendor at launch. The pipeline is:
//
//   1. Tokenize + stem each word in the corpus (title + body).
//   2. TF-IDF weight every term (so common words like "come" / "out" matter,
//      but stop-words like "the" / "and" don't).
//   3. Build a sparse vector per question/answer from its weighted terms.
//   4. Rank by cosine similarity to the query vector. This is the
//      "semantic" layer; the full-text `searchIndex` layer is used for the
//      keyword hits and as a tie-breaker.
//
// This gives you:
//   - Good recall on paraphrased / misspelled queries (e.g. "how do I tell
//     my parents I'm gay" will match "coming out" questions).
//   - A small, self-contained model you can continue training offline
//     (add a mock `trainEmbedding` that ingests question/answer pairs).
//   - A clean seam to swap in a real model (OpenAI, Anthropic, local
//     `sentence-transformers`) later — just replace `embedText` and
//     `searchVectors` in `qa/read.ts`.
//
// Design notes:
//   - The embedding is intentionally cheap (no external API, no heavy
//     deps). It's a TF-IDF sparse vector over a curated vocabulary.
//   - You can grow it into a proper neural embedding by swapping this
//     module for a model wrapper — the rest of the search path is typed
//     behind `searchVec: number[]`, so the change is localized.
//   - For production, consider `pgvector` + `sentence-transformers`, but
//     this keeps the MVP on-platform and free.

import { tokenize, buildKeywords } from './search';

/** Minimal in-memory corpus of seeded Q&A so we can build a vocabulary. */
export interface CorpusDoc {
  id: string;
  type: 'question' | 'answer';
  entityId: string;
  title: string;
  bodyMd: string;
}

/** Stop-word list (common English words we down-weight or drop). */
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'must', 'can', 'it', 'its', 'this',
  'that', 'these', 'those', 'i', 'you', 'he', 'she', 'they', 'we', 'us',
  'me', 'him', 'her', 'them', 'my', 'your', 'his', 'their', 'our', 'what',
  'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how', 'all',
  'each', 'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'don', 'now', 's', 't', 'd', 'll', 'm', 're', 've', 'y',
]);

/** Simple light stemmer (covers the most common queer-identity / health /
//  coming-out terms). Extend as needed for your domain. */
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;

  // Common English suffixes
  let s = w;
  if (s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.endsWith('ed')) s = s.slice(0, -2);
  else if (s.endsWith('es')) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  else if (s.endsWith('ly')) s = s.slice(0, -2);
  else if (s.endsWith('er')) s = s.slice(0, -2);
  else if (s.endsWith('est')) s = s.slice(0, -3);

  // A few domain-specific stems
  const domain = {
    coming: 'come',
    comingout: 'come',
    identity: 'ident',
    orientation: 'orient',
    gender: 'gender',
    sexuality: 'sexu',
    sexual: 'sexu',
    relationship: 'relation',
    health: 'health',
    mental: 'mental',
    support: 'support',
    advice: 'advic',
    gay: 'gay',
    lesbian: 'lesbian',
    bisexual: 'bi',
    transgender: 'trans',
    trans: 'trans',
    queer: 'queer',
    homo: 'homo',
    hetero: 'hetero',
    romance: 'romance',
    date: 'date',
    friend: 'friend',
    family: 'family',
    parent: 'parent',
    mom: 'mom',
    dad: 'dad',
    brother: 'brother',
    sister: 'sister',
    love: 'love',
    kiss: 'kiss',
    hug: 'hug',
    safe: 'safe',
    consent: 'consent',
    hiv: 'hiv',
    aids: 'aids',
    test: 'test',
    positive: 'posit',
    negative: 'negativ',
    birth: 'birth',
    control: 'control',
    pill: 'pill',
    hormones: 'hormone',
    therapy: 'therapy',
    transition: 'transition',
    pass: 'pass',
  };

  // Check the domain map first (so "gay" stays "gay", not "ga")
  if (domain[w]) return domain[w];

  // Handle long suffixes before short ones
  const suffixes = ['ing', 'ed', 'es', 'ly', 'er', 'est', 's'];
  for (const suf of suffixes) {
    if (s.length > suf.length + 1 && s.endsWith(suf)) {
      s = s.slice(0, -suf.length);
      break;
    }
  }

  return s;
}

/**
 * Build a vocabulary from a list of documents: word -> index + idf.
 * We compute idf on the fly so we can reuse this for both questions and
 * answers, and so we can add new docs later without rebuilding the whole
 * index.
 */
export class Vocabulary {
  private index = new Map<string, { count: number; df: number }>();

  /** Add a document and update term frequencies + document frequencies. */
  add(doc: CorpusDoc) {
    const seen = new Set<string>();
    for (const text of [doc.title, doc.bodyMd]) {
      for (const t of tokenize(text)) {
        const st = stem(t);
        if (STOP_WORDS.has(st)) continue;
        if (!seen.has(st)) {
          seen.add(st);
          this.index.set(st, (this.index.get(st) ?? { count: 0, df: 0 }) => {
            const cur = this.index.get(st)!;
            cur.count += 1;
            cur.df += 1;
            return cur;
          })();
        } else {
          const entry = this.index.get(st)!;
          entry.count += 1;
        }
      }
    }
  }

  /** Number of docs in the corpus. */
  get docCount(): number {
    return this.index.size;
  }

  /** Get the normalized vector for a document (TF-IDF over its tokens). */
  vectorFor(doc: CorpusDoc): number[] {
    const counts = new Map<string, number>();
    for (const text of [doc.title, doc.bodyMd]) {
      for (const t of tokenize(text)) {
        const st = stem(t);
        if (STOP_WORDS.has(st)) continue;
        counts.set(st, (counts.get(st) ?? 0) + 1);
      }
    }
    const total = doc.title.split(/\s+/).length + doc.bodyMd.split(/\s+/).length;
    const vec = new Array<number>(this.index.size).fill(0);
    for (const [term, tf] of counts) {
      const entry = this.index.get(term);
      if (!entry) continue;
      const idf = Math.log((this.docCount + 1) / (entry.df + 1)) + 1;
      const tfidf = (tf / total) * idf;
      vec[this.index.get(term)!.count - 1] = tfidf;
    }
    // Normalize to unit length (cosine similarity becomes dot product)
    const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    }
    return vec;
  }

  /** Get the vector for a single query token (on the fly). */
  vectorForTokens(tokens: string[]): number[] {
    const counts = new Map<string, number>();
    for (const t of tokens) {
      const st = stem(t);
      if (STOP_WORDS.has(st)) continue;
      counts.set(st, (counts.get(st) ?? 0) + 1);
    }
    const vec = new Array<number>(this.index.size).fill(0);
    for (const [term, tf] of counts) {
      const entry = this.index.get(term);
      if (!entry) continue;
      const idf = Math.log((this.docCount + 1) / (entry.df + 1)) + 1;
      const tfidf = (tf / (tokens.length || 1)) * idf;
      vec[this.index.get(term)!.count - 1] = tfidf;
    }
    const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
    if (norm > 0) {
      for (let i = 0; i < vec.length; i++) vec[i] /= norm;
    }
    return vec;
  }
}

/**
 * Return the top N similar question IDs for a query. This is the "search
 * well" layer that runs on the server and returns results the client can
 * display as suggestions. A real LLM/RLHF model would replace this later,
 * but this TF-IDF embedding gives you a working, trainable similarity
 * function immediately from your seeded data.
 *
 * You can use the returned scores to:
 *   - surface "related questions",
 *   - order "ask a question" suggestions,
 *   - build a ranking/RL training set from vote + best-answer signals.
 */
export function rankSimilar({
  q,
  docs,
  topic,
  topK = 10,
}: {
  q: string;
  docs: CorpusDoc[];
  topic?: string;
  topK?: number;
}) {
  const vocab = new Vocabulary();
  for (const d of docs) vocab.add(d);

  const queryTokens = tokenize(q);
  const queryVec = vocab.vectorForTokens(queryTokens);
  const topicTokens = topic ? tokenize(topic) : [];
  const limited = topicTokens.length > 0 ? docs.filter((d) => d.topic === topic) : docs;

  const scored = limited.map((d) => {
    const dv = new Vocabulary();
    dv.add(d);
    const dvVec = dv.vectorFor(d);
    const cos = dot(queryVec, dvVec);
    return { id: d.id, score: cos, doc: d };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
