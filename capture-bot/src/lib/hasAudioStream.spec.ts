import { execFile } from 'child_process';
import { hasAudioStream } from './hasAudioStream';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const execFileMock = jest.mocked(execFile);

describe('hasAudioStream', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns true when ffprobe finds an audio stream', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, 'audio\n', '');
    });

    await expect(
      hasAudioStream('/tmp/source.mp4', {
        enabled: true,
        whisperEngine: 'whisper-cpp',
        ffprobePath: '/bin/ffprobe',
      }),
    ).resolves.toBe(true);
  });

  it('returns false when ffprobe finds no audio stream', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, '', '');
    });

    await expect(
      hasAudioStream('/tmp/source.mp4', { enabled: true, whisperEngine: 'whisper-cpp' }),
    ).resolves.toBe(false);
  });

  it('returns false when ffprobe exits with an error', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(new Error('Stream not found'), '', 'No audio stream');
    });

    await expect(
      hasAudioStream('/tmp/source.mp4', { enabled: true, whisperEngine: 'whisper-cpp' }),
    ).resolves.toBe(false);
  });
});
