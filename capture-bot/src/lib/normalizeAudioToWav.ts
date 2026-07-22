import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { isMissingAudioStreamError } from './isMissingAudioStreamError';
import { VideoEnrichmentConfig } from './videoEnrichmentConfig';

const execFileAsync = promisify(execFile);
const NORMALIZE_TIMEOUT_MS = 120_000;
const LOG_PREFIX = '[video-enrichment]';

export async function normalizeAudioToWav(
  inputPath: string,
  tmpDir: string,
  config: VideoEnrichmentConfig,
): Promise<string | null> {
  const outputPath = path.join(tmpDir, 'temp_16k.wav');
  const ffmpegBin = config.ffmpegPath ?? 'ffmpeg';

  if (!config.ffmpegPath) {
    console.error(
      `${LOG_PREFIX} FFMPEG_PATH is not set; falling back to "ffmpeg" on PATH`,
    );
  }

  const args = [
    '-y',
    '-i',
    inputPath,
    '-ar',
    '16000',
    '-ac',
    '1',
    '-c:a',
    'pcm_s16le',
    outputPath,
  ];

  console.log(
    `${LOG_PREFIX} ffmpeg: normalizing ${inputPath} -> ${outputPath}`,
  );
  console.log(`${LOG_PREFIX} ffmpeg: ${ffmpegBin} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync(ffmpegBin, args, {
      timeout: NORMALIZE_TIMEOUT_MS,
      encoding: 'utf-8',
    });

    if (stderr) {
      console.log(`${LOG_PREFIX} ffmpeg stderr:\n${stderr}`);
    }
    if (stdout) {
      console.log(`${LOG_PREFIX} ffmpeg stdout:\n${stdout}`);
    }

    console.log(`${LOG_PREFIX} ffmpeg: normalization complete`);
    return outputPath;
  } catch (err) {
    const error = err as Error & { stderr?: string; stdout?: string };
    const combinedOutput = [error.message, error.stderr, error.stdout]
      .filter(Boolean)
      .join('\n');

    if (isMissingAudioStreamError(combinedOutput)) {
      console.log(
        `${LOG_PREFIX} No audio track found in video file — skipping transcription.`,
      );
      return null;
    }

    console.error(`${LOG_PREFIX} ffmpeg failed:`, error.message);
    if (error.stderr) {
      console.error(`${LOG_PREFIX} ffmpeg stderr:\n${error.stderr}`);
    }
    if (error.stdout) {
      console.error(`${LOG_PREFIX} ffmpeg stdout:\n${error.stdout}`);
    }
    throw err;
  }
}
