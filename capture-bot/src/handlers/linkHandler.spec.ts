import { Context } from 'telegraf';
import { handleLink } from './linkHandler';
import * as vaultWriter from '../lib/vaultWriter';
import { enrichVideoNoteWithTranscript } from '../lib/enrichVideoNoteWithTranscript';

jest.mock('../lib/vaultWriter');
jest.mock('../lib/enrichVideoNoteWithTranscript', () => ({
  enrichVideoNoteWithTranscript: jest.fn().mockResolvedValue(undefined),
}));

const mockedVault = jest.mocked(vaultWriter);
const mockedEnrich = jest.mocked(enrichVideoNoteWithTranscript);

const videoConfig = {
  enabled: true,
  whisperEngine: 'whisper-cpp' as const,
  whisperCppBin: '/bin/whisper-cli',
  whisperModelPath: '/models/base.bin',
};

describe('handleLink — TikTok', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    mockedVault.filenameStemFromDate.mockReturnValue('20260722T040000Z');
    mockedVault.writeRawFile.mockResolvedValue('raw/tiktok/20260722T040000Z.md');
    mockedVault.appendLog.mockResolvedValue(undefined);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('writes oEmbed metadata when the TikTok API succeeds', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        title: 'Easy pasta',
        author_name: 'Chef Ana',
        author_url: 'https://www.tiktok.com/@chef',
      }),
    }) as unknown as typeof fetch;

    const ctx = { reply: jest.fn() } as unknown as Context;
    const url = 'https://vm.tiktok.com/ABC123/';

    await handleLink(ctx, url, '/vault', videoConfig);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(mockedVault.writeRawFile).toHaveBeenCalledWith(
      '/vault',
      'tiktok',
      '20260722T040000Z',
      expect.objectContaining({ sourceUrl: url }),
      expect.stringContaining('**Video Caption/Title:** Easy pasta'),
    );
    expect(ctx.reply).toHaveBeenCalledWith('Saved.');
    expect(mockedEnrich).toHaveBeenCalledWith(
      expect.stringMatching(/raw[\\/]tiktok[\\/]20260722T040000Z\.md$/),
      url,
      videoConfig,
    );
  });

  it('falls back to a bookmark note when oEmbed fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('timeout')) as unknown as typeof fetch;

    const ctx = { reply: jest.fn() } as unknown as Context;
    const url = 'https://www.tiktok.com/@chef/video/1';

    await handleLink(ctx, url, '/vault', videoConfig);

    expect(mockedVault.writeRawFile).toHaveBeenCalledWith(
      '/vault',
      'tiktok',
      '20260722T040000Z',
      expect.objectContaining({ metadataExtractionFailed: true, sourceUrl: url }),
      `# ${url}\n\n${url}`,
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      'Saved the link, but metadata could not be fetched.',
    );
  });
});
