import * as fs from 'fs/promises';
import { enrichVideoNoteWithTranscript } from './enrichVideoNoteWithTranscript';
import { extractAudioWithYtDlp } from './extractAudioWithYtDlp';
import { normalizeAudioToWav } from './normalizeAudioToWav';
import { transcribeWithWhisper } from './transcribeWithWhisper';
import { appendVideoTranscriptSection } from './vaultWriter';
import { VideoEnrichmentConfig } from './videoEnrichmentConfig';

jest.mock('./extractAudioWithYtDlp');
jest.mock('./normalizeAudioToWav');
jest.mock('./transcribeWithWhisper');
jest.mock('./vaultWriter');
jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn().mockResolvedValue('/tmp/capture-bot-audio-abc'),
  rm: jest.fn().mockResolvedValue(undefined),
}));

const mockedExtract = jest.mocked(extractAudioWithYtDlp);
const mockedNormalize = jest.mocked(normalizeAudioToWav);
const mockedTranscribe = jest.mocked(transcribeWithWhisper);
const mockedAppend = jest.mocked(appendVideoTranscriptSection);
const mockedRm = jest.mocked(fs.rm);

const config: VideoEnrichmentConfig = {
  enabled: true,
  whisperEngine: 'whisper-cpp',
  whisperCppBin: '/bin/whisper-cli',
  whisperModelPath: '/models/base.bin',
};

describe('enrichVideoNoteWithTranscript', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedExtract.mockResolvedValue('/tmp/capture-bot-audio-abc/source.webm');
    mockedNormalize.mockResolvedValue(
      '/tmp/capture-bot-audio-abc/temp_16k.wav',
    );
  });

  it('appends a transcript when the pipeline succeeds', async () => {
    mockedTranscribe.mockResolvedValue(
      'Here is the spoken content from the video.',
    );

    await enrichVideoNoteWithTranscript(
      '/vault/raw/tiktok/note.md',
      'https://youtu.be/abc',
      config,
    );

    expect(mockedAppend).toHaveBeenCalledWith(
      '/vault/raw/tiktok/note.md',
      'Here is the spoken content from the video.',
    );
    expect(mockedRm).toHaveBeenCalled();
  });

  it('skips append for empty or noise transcripts', async () => {
    mockedTranscribe.mockResolvedValue('[Music]');

    await enrichVideoNoteWithTranscript(
      '/vault/raw/tiktok/note.md',
      'https://youtu.be/abc',
      config,
    );

    expect(mockedAppend).not.toHaveBeenCalled();
    expect(mockedRm).toHaveBeenCalled();
  });

  it('cleans up temp files when extraction fails', async () => {
    mockedExtract.mockRejectedValue(new Error('download failed'));

    await enrichVideoNoteWithTranscript(
      '/vault/raw/tiktok/note.md',
      'https://youtu.be/abc',
      config,
    );

    expect(mockedAppend).not.toHaveBeenCalled();
    expect(mockedRm).toHaveBeenCalled();
  });

  it('skips transcription gracefully when the media file has no audio track', async () => {
    mockedNormalize.mockResolvedValue(null);

    await enrichVideoNoteWithTranscript(
      '/vault/raw/tiktok/note.md',
      'https://youtu.be/abc',
      config,
    );

    expect(mockedTranscribe).not.toHaveBeenCalled();
    expect(mockedAppend).not.toHaveBeenCalled();
    expect(mockedRm).toHaveBeenCalled();
  });

  it('no-ops when enrichment is not configured', async () => {
    await enrichVideoNoteWithTranscript(
      '/vault/raw/tiktok/note.md',
      'https://youtu.be/abc',
      {
        enabled: false,
        whisperEngine: 'whisper-cpp',
      },
    );

    expect(mockedExtract).not.toHaveBeenCalled();
  });
});
