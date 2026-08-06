import { STOPWORDS } from "./stopwords";

const ARABIC_LETTER_VARIANTS: Record<string, string> = {
  "أ": "ا",
  "إ": "ا",
  "آ": "ا",
  "ٱ": "ا",
  "ى": "ي",
  "ة": "ه",
};

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const WESTERN_DIGITS = "0123456789";

/**
 * Collapse Arabic letter variants so أ/إ/آ → ا, ى → ي, ة → ه. Without this,
 * "ايفون" and "آيفون" are different tokens and never match each other.
 */
export function normalizeArabicLetters(input: string): string {
  return input.replace(/[أإآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
}

/** Convert Arabic-Indic digits (١٣) to western (13) — both are common on Jumia/Noon. */
export function arabicDigitsToWestern(input: string): string {
  return input.replace(/[٠-٩]/g, (d) => WESTERN_DIGITS[ARABIC_DIGITS.indexOf(d)]);
}

/** Strip the Arabic definite article prefix so "الموبايل" matches "موبايل". */
export function stripDefiniteArticle(input: string): string {
  return input.startsWith("ال") && input.length > 3 ? input.slice(2) : input;
}

/** Strip English plural suffix so "headphones" matches "headphone". */
export function stripEnglishPlural(input: string): string {
  if (input.length > 3 && input.endsWith("s") && !input.endsWith("ss")) return input.slice(0, -1);
  return input;
}

/**
 * Canonical base form of a token used for fuzzy/string comparison: unifies
 * Arabic letters, converts Arabic digits, strips definite article + plurals.
 * (Synonym grouping lives in score.ts via SYNONYM_GROUPS.)
 */
export function baseForm(input: string): string {
  return stripEnglishPlural(stripDefiniteArticle(arabicDigitsToWestern(normalizeArabicLetters(input))));
}

export function normalizeProductName(name: string) {
  let text = name.toLowerCase().trim();

  // Keep Arabic letters, English letters, digits (western + arabic-indic), spaces.
  text = text.replace(/[^؀-ۿa-z0-9٠-٩\s]/gi, " ");

  let tokens = text.split(/\s+/);

  tokens = tokens.filter((t) => t.length > 1 && !STOPWORDS.includes(t));

  tokens = Array.from(new Set(tokens));

  return {
    normalizedName: tokens.join(" "),
    tokens,
  };
}
