import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

const allowedTags = sanitizeHtml.defaults.allowedTags.concat([
  'img',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'del',
  'ins',
  'sup',
  'sub'
]);

const allowedAttributes = {
  ...sanitizeHtml.defaults.allowedAttributes,
  img: ['src', 'alt', 'title', 'width', 'height'],
  a: ['href', 'name', 'target', 'rel'],
  '*': ['class']
};

/** Render untrusted markdown to safe HTML. */
export function mdToHtml(md: string): string {
  const html = marked.parse(md || '', { async: false }) as string;
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: { img: ['http', 'https', 'data'] }
  });
}

/** Strip markdown/HTML to a plain-text excerpt. */
export function mdToText(md: string, maxLen = 200): string {
  const html = mdToHtml(md);
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > maxLen ? text.slice(0, maxLen).trimEnd() + '…' : text;
}
