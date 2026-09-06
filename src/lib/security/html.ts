'use client';

import DOMPurify from 'dompurify';

// Leaflet interprets strings as HTML; React's automatic escaping does not apply.
export function sanitizeMapHtml<T>(content: T): T | string {
  if (typeof content !== 'string') return content;
  return DOMPurify.sanitize(content, {
    FORBID_TAGS: ['style', 'iframe', 'form'],
    FORBID_ATTR: ['srcdoc'],
  });
}
