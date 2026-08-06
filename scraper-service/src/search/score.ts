import { baseForm, normalizeArabicLetters, arabicDigitsToWestern } from "./normalize";

/**
 * Arabic → Latin transliteration for the letters that show up in product/brand
 * names (iphone/ايفون, لابتوب/laptop, سماعة/sam3a). Used so a query typed in
 * English still matches a product named in Arabic and vice versa.
 */
const AR_LA: [RegExp, string][] = [
  [/ا|أ|إ|آ|ٱ/g, "a"],
  [/ب/g, "b"],
  [/ت/g, "t"],
  [/ث/g, "th"],
  [/ج/g, "g"],
  [/ح/g, "h"],
  [/خ/g, "kh"],
  [/د/g, "d"],
  [/ذ/g, "th"],
  [/ر/g, "r"],
  [/ز/g, "z"],
  [/س/g, "s"],
  [/ش/g, "sh"],
  [/ص/g, "s"],
  [/ض/g, "d"],
  [/ط/g, "t"],
  [/ظ/g, "z"],
  [/ع/g, "a"],
  [/غ/g, "gh"],
  [/ف/g, "f"],
  [/ق/g, "q"],
  [/ك/g, "k"],
  [/ل/g, "l"],
  [/م/g, "m"],
  [/ن/g, "n"],
  [/ه|ة/g, "h"],
  [/و/g, "w"],
  [/ي|ى/g, "y"],
];

/** Convert an Arabic token to a Latin rendering for cross-script comparison. */
export function arabicToLatin(input: string): string {
  const noDigits = arabicDigitsToWestern(normalizeArabicLetters(input));
  let out = "";
  for (const ch of noDigits) {
    if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else {
      for (const [re, latin] of AR_LA) {
        if (re.test(ch)) {
          out += latin;
          break;
        }
      }
    }
  }
  return out;
}

/** Levenshtein edit distance, capped cheaply — used for typo near-misses. */
export function editDistance(a: string, b: string, cap = 2): number {
  if (a === b) return 0;
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > cap) return cap + 1;
  const row0 = Array.from({ length: lb + 1 }, (_, i) => i);
  for (let i = 1; i <= la; i++) {
    const row1 = [i];
    for (let j = 1; j <= lb; j++) {
      row1[j] = Math.min(
        row0[j] + 1,
        row1[j - 1] + 1,
        row0[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let j = 0; j <= lb; j++) row0[j] = row1[j];
    if (Math.min(...row0) > cap) return cap + 1;
  }
  return row0[lb];
}

/**
 * Hardcoded synonym groups for common category/brand words in the Egyptian
 * market. Query "لابتوب" and product "laptop" are different scripts entirely,
 * so we group canonical equivalents here rather than relying on scoring.
 */
const SYNONYM_GROUPS: string[][] = [
  ["mobile", "phone", "smartphone", "هاتف", "تليفون", "تلفون", "موبايل"],
  ["laptop", "notebook", "لابتوب"],
  ["headphone", "earphone", "earbud", "سماعة", "سماعات"],
  ["television", "tv", "screen", "تلفزيون", "شاشة"],
  ["tablet", "تابلت", "جهازلوحي"],
  ["watch", "ساعة"],
  ["iphone", "ايفون", "آيفون"],
  ["samsung", "سامسونج", "سامسونق"],
  ["charger", "شاحن", "شحن"],
  ["cable", "كابل", "كابلشحن"],
];

const SYNONYM_TO_CANON: Map<string, string> = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const word of group) SYNONYM_TO_CANON.set(word, group[0]);
}

/** True if both tokens belong to the same synonym group. */
function sameSynonymGroup(a: string, b: string): boolean {
  const ca = SYNONYM_TO_CANON.get(a);
  return ca !== undefined && ca === SYNONYM_TO_CANON.get(b);
}

/** Compare two tokens; returns match tier: 1 exact, 0.5 substring, 0.3 fuzzy, 0 none. */
function tokenMatch(pToken: string, qToken: string): number {
  const pBase = baseForm(pToken);
  const qBase = baseForm(qToken);

  // Exact (after normalization) — unifies أ/إ/آ, ى/ي, ة/ه, Arabic digits.
  if (pBase === qBase) return 1;

  // Substring containment.
  if (pBase.includes(qBase) || qBase.includes(pBase)) return 0.5;

  // Cross-script: ايفون ↔ iphone.
  if (pBase !== pToken || qBase !== qToken) {
    const pLat = arabicToLatin(pBase);
    const qLat = arabicToLatin(qBase);
    if (pLat && qLat && (pLat === qLat || pLat.includes(qLat) || qLat.includes(pLat))) return 1;
  }

  // Synonym group: لابتوب ↔ laptop.
  if (sameSynonymGroup(pBase, qBase)) return 1;

  // Fuzzy near-miss for longer tokens: 1 typo over >= 5 chars.
  if (pBase.length >= 5 && qBase.length >= 5) {
    if (editDistance(pBase, qBase) <= 1) return 0.3;
  }

  return 0;
}

export function scoreProduct(
  productTokens: string[],
  queryTokens: string[]
): number {
  let score = 0;

  for (const qToken of queryTokens) {
    let matched = false;

    for (const pToken of productTokens) {
      const tier = tokenMatch(pToken, qToken);
      if (tier > 0) {
        score += tier;
        matched = true;
        break;
      }
    }

    // Penalize a missing query token so a partial brand match ("iphone" only)
    // on the wrong model ("آيفون 15") drops below threshold instead of passing.
    if (!matched) {
      score -= 0.5;
    }
  }

  return score;
}
