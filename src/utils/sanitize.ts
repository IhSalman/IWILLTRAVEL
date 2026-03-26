/**
 * HTML sanitisation utilities.
 * Use `escapeHtml` before embedding any user-supplied string into HTML content
 * (email templates, etc.) to prevent XSS attacks.
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
};

/**
 * Escapes HTML special characters in a string.
 * Safe to use inside HTML attribute values and text content.
 */
export function escapeHtml(input: unknown): string {
    if (typeof input !== 'string') return '';
    return input.replace(/[&<>"'/]/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}
