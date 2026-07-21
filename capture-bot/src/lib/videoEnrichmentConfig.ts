import { resolveFfmpegTools } from './resolveFfmpegTools';

export type WhisperEngine = 'whisper-cpp' | 'faster-whisper';

export interface VideoEnrichmentConfig {
  enabled: boolean;
  whisperEngine: WhisperEngine;
  whisperCppBin?: string;
  whisperModelPath?: string;
  fasterWhisperPython?: string;
  ytDlpPath?: string;
  ffmpegPath?: string;
  ffprobePath?: string;
  ffmpegLocation?: string;
}

export function loadVideoEnrichmentConfig(): VideoEnrichmentConfig {
  const enabled = process.env.VIDEO_TRANSCRIPTION_ENABLED !== 'false';
  const whisperEngine =
    process.env.WHISPER_ENGINE === 'faster-whisper' ? 'faster-whisper' : 'whisper-cpp';

  const ffmpegPath = process.env.FFMPEG_PATH || undefined;
  const ffprobeEnv = process.env.FFPROBE_PATH || undefined;
  const ffmpegTools = resolveFfmpegTools(ffmpegPath, ffprobeEnv);

  return {
    enabled,
    whisperEngine,
    whisperCppBin: process.env.WHISPER_CPP_BIN || undefined,
    whisperModelPath: process.env.WHISPER_MODEL_PATH || undefined,
    fasterWhisperPython: process.env.FASTER_WHISPER_PYTHON || 'python',
    ytDlpPath: process.env.YT_DLP_PATH || undefined,
    ffmpegPath: ffmpegTools.ffmpegPath,
    ffprobePath: ffmpegTools.ffprobePath,
    ffmpegLocation: ffmpegTools.ffmpegLocation,
  };
}

export function isVideoEnrichmentConfigured(config: VideoEnrichmentConfig): boolean {
  if (!config.enabled || !config.whisperModelPath) {
    return false;
  }

  if (config.whisperEngine === 'whisper-cpp') {
    return Boolean(config.whisperCppBin);
  }

  return Boolean(config.fasterWhisperPython);
}
