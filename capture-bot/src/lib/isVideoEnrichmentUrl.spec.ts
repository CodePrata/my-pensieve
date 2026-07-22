import { isVideoEnrichmentUrl } from './isVideoEnrichmentUrl';

describe('isVideoEnrichmentUrl', () => {
  it('matches TikTok URLs', () => {
    expect(isVideoEnrichmentUrl('https://vm.tiktok.com/ABC123/')).toBe(true);
    expect(isVideoEnrichmentUrl('https://www.tiktok.com/@chef/video/1')).toBe(
      true,
    );
  });

  it('matches YouTube URLs', () => {
    expect(isVideoEnrichmentUrl('https://www.youtube.com/watch?v=abc')).toBe(
      true,
    );
    expect(isVideoEnrichmentUrl('https://youtu.be/abc')).toBe(true);
  });

  it('matches Instagram Reels only', () => {
    expect(isVideoEnrichmentUrl('https://www.instagram.com/reel/ABC123/')).toBe(
      true,
    );
    expect(
      isVideoEnrichmentUrl('https://www.instagram.com/reels/ABC123/'),
    ).toBe(true);
    expect(isVideoEnrichmentUrl('https://www.instagram.com/p/ABC123/')).toBe(
      false,
    );
  });

  it('matches X/Twitter status URLs', () => {
    expect(isVideoEnrichmentUrl('https://twitter.com/user/status/123')).toBe(
      true,
    );
    expect(isVideoEnrichmentUrl('https://x.com/user/status/123')).toBe(true);
    expect(isVideoEnrichmentUrl('https://x.com/user')).toBe(false);
  });

  it('matches Reddit video URLs', () => {
    expect(
      isVideoEnrichmentUrl('https://www.reddit.com/r/foo/comments/abc/title/'),
    ).toBe(true);
    expect(isVideoEnrichmentUrl('https://v.redd.it/abc123')).toBe(true);
    expect(isVideoEnrichmentUrl('https://www.reddit.com/r/foo/')).toBe(false);
  });

  it('rejects non-video URLs', () => {
    expect(isVideoEnrichmentUrl('https://github.com/foo/bar')).toBe(false);
    expect(isVideoEnrichmentUrl('not-a-url')).toBe(false);
  });
});
