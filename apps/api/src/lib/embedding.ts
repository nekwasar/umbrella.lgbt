// ---- light embedding + ranking --------------------------------------
//
// Hybrid search's in-process layer. Two deterministic embeddings, both
// dependency-free (no model vendor, no native addons):
//
//   1. TF-IDF vocabulary vectors (`Vocabulary` + `rankSimilar`) — built over
//      the candidate corpus at query time for paraphrase-tolerant ranking
//      ("how do I tell my parents I'm gay" ≈ "coming out" questions).
//      Corpus-aware: idf down-weights terms common across the corpus.
//
//   2. Hashing embedding (`embedText()`, EMBED_DIM dims) — a stable
//      bag-of-stems vector signed-hashed into a fixed-size vector. Because it
//      does not depend on the corpus, it can be stored per row in
//      `Question.searchVec` / `Answer.searchVec` and compared with cosine
//      similarity at any time (writers live in `lib/search.ts`).
//
// Swap-in seam for a real model later (OpenAI / Anthropic /
// sentence-transformers): replace `embedText` + `cosine` — storage
// (`searchVec Float[]`) and every caller stay unchanged.
//
// The keyword layer is separate: `searchIndex` is a Postgres GENERATED
// tsvector column (see the search migration), ranked by ts_rank inside
// `searchQuestions()` in `lib/search.ts`.

import { tokenize } from './search';

/** Fixed dimension for the stored hashing embedding (`searchVec`). */
export const EMBED_DIM = 384;

/** Minimal corpus doc used for in-process ranking. */
export interface CorpusDoc {
  id: string;
  type: 'question' | 'answer';
  entityId: string;
  title: string;
  bodyMd: string;
  topic?: string | null;
}

/** Stop-word list (common English words we drop before embedding/ranking). */
export const STOP_WORDS = new Set([
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

/** Light domain-aware stemmer (common English suffixes + queer/health terms). */
function stem(word: string): string {
  const w = word.toLowerCase();
  if (w.length <= 3) return w;

  // A few domain-specific stems (checked first so "gay" stays "gay", not "ga")
  const domain: Record<string, string> = {
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
  if (domain[w]) return domain[w];

  // Common English suffixes (longest first)
  let s = w;
  if (s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.endsWith('ed')) s = s.slice(0, -2);
  else if (s.endsWith('es')) s = s.slice(0, -2);
  else if (s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  else if (s.endsWith('ly')) s = s.slice(0, -2);
  else if (s.endsWith('er')) s = s.slice(0, -2);
  else if (s.endsWith('est')) s = s.slice(0, -3);

  return s;
}

/** Normalize a vector to unit length (cosine similarity becomes a dot product). */
function normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((a, b) => a + b * b, 0));
  if (norm > 0) {
    for (let i = 0; i < vec.length; i++) vec[i] /= norm;
  }
  return vec;
}

/** FNV-1a 32-bit hash (stable across processes for the hashing embedding). */
function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Corpus-independent hashing embedding: stemmed terms are signed-hashed into
 * a fixed EMBED_DIM vector (bag of stems with sublinear tf). Deterministic,
 * cheap, and safe to persist in `searchVec`.
 */
export function embedText(text: string): number[] {
  const counts = new Map<string, number>();
  for (const t of tokenize(text)) {
    const st = stem(t);
    if (STOP_WORDS.has(st)) continue;
    counts.set(st, (counts.get(st) ?? 0) + 1);
  }
  const vec = new Array<number>(EMBED_DIM).fill(0);
  for (const [term, tf] of counts) {
    const h = fnv1a(term);
    const idx = (h >>> 1) % EMBED_DIM;
    const sign = h & 1 ? 1 : -1;
    vec[idx] += sign * (1 + Math.log(tf));
  }
  return normalize(vec);
}

/**
 * Cosine similarity, length-tolerant (returns 0 on a length mismatch or a
 * zero vector instead of producing garbage scores).
 */
export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let dotSum = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) dotSum += a[i] * b[i];
  for (let i = 0; i < a.length; i++) na += a[i] * a[i];
  for (let i = 0; i < b.length; i++) nb += b[i] * b[i];
  if (na === 0 || nb === 0) return 0;
  return dotSum / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Vocabulary built from a corpus: term -> { count, df } plus a stable
 * term -> vector index map (insertion order), so every vector produced by
 * one Vocabulary is index-aligned.
 */
export class Vocabulary {
  private index = new Map<string, { count: number; df: number }>();
  private termPos = new Map<string, number>();
  private docs = 0;

  /** Add a document and update term frequencies + document frequencies. */
  add(doc: CorpusDoc): void {
    const seen = new Set<string>();
    for (const text of [doc.title, doc.bodyMd]) {
      for (const t of tokenize(text)) {
        const st = stem(t);
        if (STOP_WORDS.has(st)) continue;
        const entry = this.index.get(st);
        if (entry) {
          entry.count += 1;
          if (!seen.has(st)) entry.df += 1;
        } else {
          this.index.set(st, { count: 1, df: 1 });
          this.termPos.set(st, this.termPos.size);
        }
        seen.add(st);
      }
    }
    this.docs += 1;
  }

  /** Number of documents added to the corpus. */
  get docCount(): number {
    return this.docs;
  }

  /** Number of distinct terms in the vocabulary. */
  get size(): number {
    return this.termPos.size;
  }

  /** Unit-length TF-IDF vector for a document, aligned to this vocabulary. */
  vectorFor(doc: CorpusDoc): number[] {
    const counts = new Map<string, number>();
    let total = 0;
    for (const text of [doc.title, doc.bodyMd]) {
      for (const t of tokenize(text)) {
        const st = stem(t);
        if (STOP_WORDS.has(st)) continue;
        counts.set(st, (counts.get(st) ?? 0) + 1);
        total += 1;
      }
    }
    const vec = new Array<number>(this.termPos.size).fill(0);
    for (const [term, tf] of counts) {
      const idx = this.termPos.get(term);
      if (idx === undefined) continue;
      const entry = this.index.get(term)!;
      const idf = Math.log((this.docs + 1) / (entry.df + 1)) + 1;
      vec[idx] = (tf / (total || 1)) * idf;
    }
    return normalize(vec);
  }

  /** Unit-length TF-IDF vector for raw query tokens, same alignment. */
  vectorForTokens(tokens: string[]): number[] {
    const counts = new Map<string, number>();
    for (const t of tokens) {
      const st = stem(t);
      if (STOP_WORDS.has(st)) continue;
      counts.set(st, (counts.get(st) ?? 0) + 1);
    }
    const total = tokens.length || 1;
    const vec = new Array<number>(this.termPos.size).fill(0);
    for (const [term, tf] of counts) {
      const idx = this.termPos.get(term);
      if (idx === undefined) continue;
      const entry = this.index.get(term)!;
      const idf = Math.log((this.docs + 1) / (entry.df + 1)) + 1;
      vec[idx] = (tf / total) * idf;
    }
    return normalize(vec);
  }
}

/**
 * Top-N similar docs for a query, TF-IDF cosine over ONE shared vocabulary
 * (every vector is index-aligned — all docs and the query come from the same
 * `Vocabulary` instance). Used by `hybridSearch()` as the semantic layer;
 * scores are `0..1` (unit vectors).
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
}): { id: string; score: number; doc: CorpusDoc }[] {
  const vocab = new Vocabulary();
  for (const d of docs) vocab.add(d);

  const queryVec = vocab.vectorForTokens(tokenize(q));
  const pool = topic ? docs.filter((d) => d.topic === topic) : docs;

  const scored = pool.map((d) => ({
    id: d.id,
    score: cosine(queryVec, vocab.vectorFor(d)),
    doc: d,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}
