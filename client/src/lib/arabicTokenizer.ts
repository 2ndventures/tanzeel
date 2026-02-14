/**
 * Tokenizes Arabic Quranic text into lexical words, merging standalone
 * Waqf (stop) marks with the adjacent word so they don't receive their
 * own word index.
 *
 * Waqf marks such as ۖ ۗ ۘ ۙ ۚ ۛ ۜ ۞ and others in the Quranic
 * annotation Unicode ranges are decorative/functional signs that should
 * not be treated as independent vocabulary words.
 *
 * Unicode ranges covered:
 *   U+0610–U+061A  Arabic annotation signs
 *   U+06D6–U+06ED  Small high/low Quranic marks (waqf signs, etc.)
 *   U+08D4–U+08E1  Extended Arabic small marks
 *   U+FBB2–U+FBC2  Arabic presentation forms for waqf (ṣalā, qalā, etc.)
 */

const STANDALONE_WAQF_RE = /^[\u0610-\u061A\u06D6-\u06ED\u08D4-\u08E1\uFBB2-\uFBC2]+$/;

/**
 * Returns true if the token consists entirely of Quranic annotation /
 * waqf-mark characters and should not be counted as its own word.
 */
function isStandaloneWaqfMark(token: string): boolean {
  return STANDALONE_WAQF_RE.test(token);
}

/**
 * Splits Arabic verse text into an array of display words, ensuring that
 * standalone waqf marks are merged into the neighbouring lexical word
 * rather than occupying their own array slot.
 *
 * - A waqf mark appearing after a word is appended to that word.
 * - A waqf mark appearing at the very start (e.g. ۞ Rub-el-Hizb) is
 *   prepended to the next word.
 *
 * This keeps the returned array length equal to the number of actual
 * vocabulary words, which matches the word indices coming from the
 * Quran.com timing API.
 */
export function tokenizeArabicWords(text: string): string[] {
  const rawTokens = text.split(' ');
  const words: string[] = [];
  let pendingPrefix = '';

  for (const token of rawTokens) {
    if (!token) continue;

    if (isStandaloneWaqfMark(token)) {
      if (words.length > 0) {
        // Merge with the preceding word
        words[words.length - 1] += ' ' + token;
      } else {
        // No preceding word yet; hold as prefix for the next real word
        pendingPrefix += (pendingPrefix ? ' ' : '') + token;
      }
    } else {
      words.push(pendingPrefix ? pendingPrefix + ' ' + token : token);
      pendingPrefix = '';
    }
  }

  return words;
}
