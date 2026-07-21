const NO_AUDIO_PATTERNS = [
  /output file .* does not contain any stream/i,
  /does not contain any stream/i,
  /no audio streams/i,
  /stream map .* matches no streams/i,
  /could not find codec parameters for stream .* \(audio\)/i,
];

export function isMissingAudioStreamError(message: string): boolean {
  return NO_AUDIO_PATTERNS.some((pattern) => pattern.test(message));
}
