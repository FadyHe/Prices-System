import { STOPWORDS } from "./stopwords";

export function normalizeProductName(name: string) {
  let text = name.toLowerCase().trim();

  text = text.replace(/[^\u0600-\u06FFa-z0-9\s]/gi, " ");

  let tokens = text.split(/\s+/);

  tokens = tokens.filter(
    (t) => t.length > 1 && !STOPWORDS.includes(t)
  );

  tokens = Array.from(new Set(tokens));

  return {
    normalizedName: tokens.join(" "),
    tokens,
  };
}
