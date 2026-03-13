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

function stripTajweedVerseEndMarker(html: string): string {
  return html.replace(/\s*<span\s+class=end>[\u0660-\u0669\d]+<\/span>/g, '');
}

export function tokenizeTajweedWords(html: string): string[] {
  const cleaned = stripTajweedVerseEndMarker(html);

  const parts: string[] = [];
  let current = '';
  let inTag = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '<') {
      inTag = true;
      current += ch;
    } else if (ch === '>') {
      inTag = false;
      current += ch;
    } else if (ch === ' ' && !inTag) {
      if (current) parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);

  const words: string[] = [];
  let pendingPrefix = '';

  for (const part of parts) {
    const textOnly = part.replace(/<[^>]*>/g, '');
    if (!textOnly.trim()) continue;

    if (isStandaloneWaqfMark(textOnly.trim())) {
      if (words.length > 0) {
        words[words.length - 1] += ' ' + part;
      } else {
        pendingPrefix += (pendingPrefix ? ' ' : '') + part;
      }
    } else {
      words.push(pendingPrefix ? pendingPrefix + ' ' + part : part);
      pendingPrefix = '';
    }
  }

  return words.map(w => applyTafkhimColoring(balanceTajweedTags(w)));
}

const TAFKHIM_LETTERS = /[\u0635\u0636\u0637\u0638\u0642\u063A\u062E]/;
const ARABIC_DIACRITIC = /[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\u08D4-\u08E1\u0610-\u061A]/;

export function applyTafkhimColoring(html: string): string {
  let result = '';
  let i = 0;
  let tajweedDepth = 0;

  while (i < html.length) {
    if (html[i] === '<') {
      const closeIdx = html.indexOf('>', i);
      if (closeIdx === -1) {
        result += html[i];
        i++;
        continue;
      }
      const tag = html.substring(i, closeIdx + 1);
      if (/^<tajweed\b/i.test(tag)) {
        tajweedDepth++;
      } else if (/^<\/tajweed\b/i.test(tag)) {
        tajweedDepth = Math.max(0, tajweedDepth - 1);
      }
      result += tag;
      i = closeIdx + 1;
      continue;
    }

    if (tajweedDepth === 0 && TAFKHIM_LETTERS.test(html[i])) {
      let run = html[i];
      i++;
      while (i < html.length && html[i] !== '<' && html[i] !== ' ' && ARABIC_DIACRITIC.test(html[i])) {
        run += html[i];
        i++;
      }
      result += `<span class="tafkhim">${run}</span>`;
    } else {
      result += html[i];
      i++;
    }
  }

  return result;
}

function balanceTajweedTags(html: string): string {
  const openTagRe = /<tajweed\s+class=([^>]+)>/g;
  const closeTagRe = /<\/tajweed>/g;

  let openCount = 0;
  let lastOpenClass = '';
  let match;

  const openPositions: string[] = [];
  while ((match = openTagRe.exec(html)) !== null) {
    openPositions.push(match[1]);
  }
  let closeCount = 0;
  while (closeTagRe.exec(html) !== null) {
    closeCount++;
  }

  openCount = openPositions.length;
  if (openCount > closeCount) {
    html += '</tajweed>'.repeat(openCount - closeCount);
  } else if (closeCount > openCount) {
    lastOpenClass = openPositions.length > 0 ? openPositions[openPositions.length - 1] : '';
    const prefix = lastOpenClass ? `<tajweed class=${lastOpenClass}>` : '';
    html = prefix.repeat(closeCount - openCount) + html;
  }

  return html;
}
