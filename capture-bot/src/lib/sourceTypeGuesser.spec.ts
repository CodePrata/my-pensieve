import { guessSourceType } from './sourceTypeGuesser';

describe('guessSourceType', () => {
  it('recognizes tiktok URLs', () => {
    expect(guessSourceType('https://www.tiktok.com/@user/video/123')).toBe(
      'tiktok',
    );
  });

  it('recognizes instagram URLs', () => {
    expect(guessSourceType('https://instagram.com/p/abc123')).toBe('instagram');
  });

  it('recognizes github URLs', () => {
    expect(guessSourceType('https://github.com/anthropics/claude-code')).toBe(
      'github',
    );
  });

  it('recognizes youtube.com URLs', () => {
    expect(guessSourceType('https://www.youtube.com/watch?v=abc123')).toBe(
      'youtube',
    );
  });

  it('recognizes youtu.be short URLs', () => {
    expect(guessSourceType('https://youtu.be/abc123')).toBe('youtube');
  });

  it('falls back to other for unrecognized domains', () => {
    expect(guessSourceType('https://example.com/some-article')).toBe('other');
  });

  it('falls back to other for malformed URLs', () => {
    expect(guessSourceType('not a url')).toBe('other');
  });
});
