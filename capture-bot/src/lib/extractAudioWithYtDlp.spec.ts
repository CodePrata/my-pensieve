import * as fs from 'fs/promises';
import * as path from 'path';
import {
  clearDownloadedMediaFiles,
  findDownloadedMediaFile,
  FORMAT_FALLBACK_MERGED,
  FORMAT_REQUIRES_AUDIO,
  YT_DLP_FORMAT_SORT,
} from './extractAudioWithYtDlp';

jest.mock('fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('extractAudioWithYtDlp format constants', () => {
  it('excludes bytevc codecs and prefers h264/aac merge formats using valid yt-dlp syntax', () => {
    expect(FORMAT_REQUIRES_AUDIO).toBe('bestaudio/best[vcodec!*=bytevc]/bv*[vcodec^=avc1]+ba/b');
    expect(FORMAT_FALLBACK_MERGED).toBe('best[vcodec!*=bytevc]/bv*[vcodec^=avc1]+ba/b');

    // No '#' characters anywhere — this caused yt-dlp's tokenizer SyntaxError.
    expect(FORMAT_REQUIRES_AUDIO).not.toContain('#');
    expect(FORMAT_FALLBACK_MERGED).not.toContain('#');
  });

  it('expresses codec preference via formatSort array, not bracket filters', () => {
    expect(YT_DLP_FORMAT_SORT).toEqual(['+vcodec:h264', '+acodec:aac', '+size']);
  });
});

describe('findDownloadedMediaFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the first source.* media file in the temp dir', async () => {
    mockedFs.readdir.mockResolvedValue(['source.webm', 'source.mp4.part'] as never);

    await expect(findDownloadedMediaFile('/tmp/capture-bot-audio-abc')).resolves.toBe(
      path.join('/tmp/capture-bot-audio-abc', 'source.webm'),
    );
  });

  it('ignores non-media source files and partial downloads', async () => {
    mockedFs.readdir.mockResolvedValue(['source.info.json', 'source.mp4.part'] as never);

    await expect(findDownloadedMediaFile('/tmp/capture-bot-audio-abc')).resolves.toBeNull();
  });
});

describe('clearDownloadedMediaFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.rm.mockResolvedValue(undefined);
  });

  it('removes source.* media files but leaves other temp artifacts', async () => {
    mockedFs.readdir.mockResolvedValue(['source.mp4', 'source.info.json', 'source.webm.part'] as never);

    await clearDownloadedMediaFiles('/tmp/capture-bot-audio-abc');

    expect(mockedFs.rm).toHaveBeenCalledWith(path.join('/tmp/capture-bot-audio-abc', 'source.mp4'), {
      force: true,
    });
    expect(mockedFs.rm).not.toHaveBeenCalledWith(
      path.join('/tmp/capture-bot-audio-abc', 'source.info.json'),
      expect.anything(),
    );
  });
});
