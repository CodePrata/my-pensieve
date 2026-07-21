import { isMissingAudioStreamError } from './isMissingAudioStreamError';

describe('isMissingAudioStreamError', () => {
  it('detects ffmpeg no-stream output errors', () => {
    expect(
      isMissingAudioStreamError('Output file #0 does not contain any stream'),
    ).toBe(true);
  });

  it('detects stream map misses', () => {
    expect(
      isMissingAudioStreamError('Stream map \'0:a:0\' matches no streams.'),
    ).toBe(true);
  });

  it('returns false for unrelated ffmpeg failures', () => {
    expect(isMissingAudioStreamError('Invalid data found when processing input')).toBe(false);
  });
});
