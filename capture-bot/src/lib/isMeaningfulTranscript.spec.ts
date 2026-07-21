import { isMeaningfulTranscript } from './isMeaningfulTranscript';

describe('isMeaningfulTranscript', () => {
  it('accepts normal speech text', () => {
    expect(isMeaningfulTranscript('This is a useful transcript about pasta.')).toBe(true);
  });

  it('rejects empty or very short output', () => {
    expect(isMeaningfulTranscript('')).toBe(false);
    expect(isMeaningfulTranscript('  ')).toBe(false);
    expect(isMeaningfulTranscript('ok')).toBe(false);
  });

  it('rejects bracket-only noise tags', () => {
    expect(isMeaningfulTranscript('[Music]')).toBe(false);
    expect(isMeaningfulTranscript('[Applause] [Music]')).toBe(false);
  });

  it('rejects common silence hallucinations', () => {
    expect(isMeaningfulTranscript('Thank you for watching')).toBe(false);
    expect(isMeaningfulTranscript('Please subscribe.')).toBe(false);
  });
});
