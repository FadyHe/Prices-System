export interface Product {
  name: string;
  price: number;
  currency: string;
  seller: string;
  url: string;
  source: string;
  image: string;
}

/** Structured per-site failure telemetry so an empty result isn't
 * indistinguishable from "genuinely no products" (3.8). */
export type SourceFailureReason =
  | 'no_selectors_matched'
  | 'captcha_detected'
  | 'timeout'
  | 'http_error'
  | 'parse_failed'
  | 'empty';

export interface SourceFailure {
  site: string;
  reason: SourceFailureReason;
  detail?: string;
}
