import DOMPurify from 'dompurify';

/**
 * Sanitize HTML intended for dangerouslySetInnerHTML.
 * Allows only the safe inline markup produced by our markdown formatter.
 */
export function sanitizeInlineHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'b', 'i', 'code', 'a', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
  });
}
