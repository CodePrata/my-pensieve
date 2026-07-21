const BRACKET_ONLY = /^(\[[^\]]+\]\s*)+$/;
const NOISE_PATTERNS = [
  /^\.+$/,
  /^…+$/,
  /^(thank you for watching\.?)$/i,
  /^(please subscribe\.?)$/i,
  /^(subscribe\.?)$/i,
];

/**
 * Filters empty transcripts and common non-speech / noise-only Whisper outputs.
 */
export function isMeaningfulTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return false;
  }

  if (BRACKET_ONLY.test(trimmed)) {
    return false;
  }

  if (NOISE_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return false;
  }

  const withoutBracketTags = trimmed.replace(/\[[^\]]+\]/g, '').trim();
  return withoutBracketTags.length >= 3;
}
