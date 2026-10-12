/**
 * Normalized provider failures. Pure (no Next.js imports) so the mapper
 * and queries can share the taxonomy without pulling in server-only code.
 * Callers must never cache these as valid data and must never expose
 * credentials alongside them.
 */

export type ProviderErrorKind =
  | 'unauthorized'
  | 'rate-limited'
  | 'not-found'
  | 'timeout'
  | 'malformed'
  | 'unavailable';

export class ProviderError extends Error {
  readonly kind: ProviderErrorKind;

  constructor(kind: ProviderErrorKind, message: string) {
    super(message);
    this.name = 'ProviderError';
    this.kind = kind;
  }
}
