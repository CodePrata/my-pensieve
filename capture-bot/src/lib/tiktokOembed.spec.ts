import {
  fetchTikTokOembed,
  formatBookmarkNote,
  formatTikTokNote,
  isTikTokUrl,
} from './tiktokOembed';

describe('isTikTokUrl', () => {
  it('matches tiktok.com and vm.tiktok.com URLs', () => {
    expect(isTikTokUrl('https://www.tiktok.com/@user/video/123')).toBe(true);
    expect(isTikTokUrl('https://vm.tiktok.com/ABC123/')).toBe(true);
    expect(isTikTokUrl('https://tiktok.com/t/xyz')).toBe(true);
  });

  it('does not match other domains', () => {
    expect(isTikTokUrl('https://youtube.com/watch?v=abc')).toBe(false);
    expect(isTikTokUrl('not-a-url')).toBe(false);
  });
});

describe('formatTikTokNote', () => {
  it('includes caption, creator link, and original URL', () => {
    const body = formatTikTokNote('https://www.tiktok.com/@chef/video/1', {
      title: 'Easy pasta recipe',
      author_name: 'Chef Ana',
      author_url: 'https://www.tiktok.com/@chef',
    });

    expect(body).toContain('# Easy pasta recipe');
    expect(body).toContain('**Video Caption/Title:** Easy pasta recipe');
    expect(body).toContain(
      '**Creator:** [Chef Ana](https://www.tiktok.com/@chef)',
    );
    expect(body).toContain(
      '**Original URL:** https://www.tiktok.com/@chef/video/1',
    );
  });
});

describe('formatBookmarkNote', () => {
  it('writes a simple bookmark with the URL', () => {
    expect(formatBookmarkNote('https://vm.tiktok.com/ABC123/')).toBe(
      '# https://vm.tiktok.com/ABC123/\n\nhttps://vm.tiktok.com/ABC123/',
    );
  });
});

describe('fetchTikTokOembed', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns parsed oEmbed fields on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          title: 'Dance trend',
          author_name: 'Mover',
          author_url: 'https://www.tiktok.com/@mover',
        }),
    });

    const result = await fetchTikTokOembed(
      'https://www.tiktok.com/@mover/video/99',
    );

    expect(global.fetch).toHaveBeenCalledWith(
      'https://www.tiktok.com/oembed?url=' +
        encodeURIComponent('https://www.tiktok.com/@mover/video/99'),
      expect.objectContaining({
        signal: expect.any(AbortSignal) as AbortSignal,
      }),
    );
    expect(result).toEqual({
      title: 'Dance trend',
      author_name: 'Mover',
      author_url: 'https://www.tiktok.com/@mover',
    });
  });

  it('returns null on non-2xx responses', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    await expect(
      fetchTikTokOembed('https://vm.tiktok.com/bad/'),
    ).resolves.toBeNull();
  });

  it('returns null on network errors and timeouts', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout'));

    await expect(
      fetchTikTokOembed('https://vm.tiktok.com/slow/'),
    ).resolves.toBeNull();
  });
});
