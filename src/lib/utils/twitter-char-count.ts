/**
 * Twitter t.co-aware character counting.
 * Every URL (http:// or https://) counts as exactly 23 characters
 * regardless of actual length, matching Twitter's t.co link wrapping.
 */

export const T_CO_LENGTH = 23;

// Matches http:// or https:// URLs
const URL_REGEX = /https?:\/\/[^\s]+/g;

export function countTweetLength(text: string): number {
  if (text.length === 0) return 0;

  let length = 0;
  let lastIndex = 0;

  for (const match of text.matchAll(URL_REGEX)) {
    const matchStart = match.index;
    // Add non-URL text before this match
    length += matchStart - lastIndex;
    // Add T_CO_LENGTH for the URL
    length += T_CO_LENGTH;
    lastIndex = matchStart + match[0].length;
  }

  // Add remaining non-URL text after the last match
  length += text.length - lastIndex;

  return length;
}
