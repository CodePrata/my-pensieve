import { execFile } from 'child_process';
import * as path from 'path';
import { normalizeAudioToWav } from './normalizeAudioToWav';

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

const execFileMock = jest.mocked(execFile);

describe('normalizeAudioToWav', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when ffmpeg reports no audio stream', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback) => {
      const error = Object.assign(new Error('Command failed'), {
        stderr: 'Output file #0 does not contain any stream',
      });
      callback(error as NodeJS.ErrnoException, '', '');
    });

    await expect(
      normalizeAudioToWav('/tmp/source.mp4', '/tmp', { enabled: true, whisperEngine: 'whisper-cpp' }),
    ).resolves.toBeNull();
  });

  it('returns wav path on success', async () => {
    execFileMock.mockImplementation((_cmd, _args, _opts, callback) => {
      callback(null, '', 'size=       1kB');
    });

    await expect(
      normalizeAudioToWav('/tmp/source.webm', '/tmp/capture-bot-audio-abc', {
        enabled: true,
        whisperEngine: 'whisper-cpp',
        ffmpegPath: '/bin/ffmpeg',
      }),
    ).resolves.toBe(path.join('/tmp/capture-bot-audio-abc', 'temp_16k.wav'));
  });
});
