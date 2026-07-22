import * as fs from 'fs/promises';
import * as path from 'path';
import ytDlpExec, { create as createYtDlpRunner } from 'yt-dlp-exec';
import { hasAudioStream } from './hasAudioStream';
import { VideoEnrichmentConfig } from './videoEnrichmentConfig';

const DOWNLOAD_TIMEOUT_MS = 120_000;
const LOG_PREFIX = '[video-enrichment]';

/** Exclude TikTok bytevc video-only streams; prefer h264 + separate audio merge. */
export const FORMAT_REQUIRES_AUDIO =
  'bestaudio/best[vcodec!*=bytevc]/bv*[vcodec^=avc1]+ba/b';

/** Fallback merged download — same bytevc exclusion, h264-first merge. */
export const FORMAT_FALLBACK_MERGED =
  'best[vcodec!*=bytevc]/bv*[vcodec^=avc1]+ba/b';

/** Prefer standard h264/aac streams over exotic TikTok codecs; smaller ties broken by size. */
export const YT_DLP_FORMAT_SORT = ['+vcodec:h264', '+acodec:aac', '+size'];

const MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.webm',
  '.m4a',
  '.mp3',
  '.opus',
  '.ogg',
  '.wav',
  '.mkv',
  '.mov',
  '.aac',
  '.flac',
]);

type YtDlpRunner = (
  url: string,
  flags?: Record<string, unknown>,
  options?: { timeout?: number },
) => Promise<unknown>;

function buildBaseFlags(
  outputTemplate: string,
  config: VideoEnrichmentConfig,
): Record<string, unknown> {
  const flags: Record<string, unknown> = {
    output: outputTemplate,
    noPlaylist: true,
    noWarnings: true,
    formatSort: YT_DLP_FORMAT_SORT,
  };

  if (config.ffmpegLocation) {
    flags.ffmpegLocation = config.ffmpegLocation;
  } else if (config.ffmpegPath) {
    console.error(
      `${LOG_PREFIX} FFMPEG_PATH is set but ffmpegLocation could not be resolved; yt-dlp may not find ffprobe`,
    );
  } else {
    console.error(
      `${LOG_PREFIX} FFMPEG_PATH is not set; yt-dlp may fail without --ffmpeg-location`,
    );
  }

  return flags;
}

function logYtDlpError(phase: string, url: string, err: unknown): void {
  const error = err as Error & { stderr?: string; stdout?: string };
  console.error(
    `${LOG_PREFIX} yt-dlp ${phase} failed for ${url}:`,
    error.message,
  );
  if (error.stderr) {
    console.error(`${LOG_PREFIX} yt-dlp ${phase} stderr:\n${error.stderr}`);
  }
  if (error.stdout) {
    console.error(`${LOG_PREFIX} yt-dlp ${phase} stdout:\n${error.stdout}`);
  }
}

export async function findDownloadedMediaFile(
  tmpDir: string,
): Promise<string | null> {
  const files = await fs.readdir(tmpDir);
  const mediaFiles = files
    .filter((file) => file.startsWith('source.') && !file.endsWith('.part'))
    .filter((file) => MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()))
    .sort();

  if (mediaFiles.length === 0) {
    return null;
  }

  return path.join(tmpDir, mediaFiles[0]);
}

export async function clearDownloadedMediaFiles(tmpDir: string): Promise<void> {
  const files = await fs.readdir(tmpDir);
  const mediaFiles = files.filter(
    (file) =>
      file.startsWith('source.') &&
      !file.endsWith('.part') &&
      MEDIA_EXTENSIONS.has(path.extname(file).toLowerCase()),
  );

  if (mediaFiles.length === 0) {
    return;
  }

  console.log(
    `${LOG_PREFIX} yt-dlp: discarding partial/broken downloads: ${mediaFiles.join(', ')}`,
  );

  await Promise.all(
    mediaFiles.map((file) => fs.rm(path.join(tmpDir, file), { force: true })),
  );
}

async function runYtDlp(
  ytDlp: YtDlpRunner,
  url: string,
  flags: Record<string, unknown>,
  phase: string,
): Promise<boolean> {
  console.log(`${LOG_PREFIX} yt-dlp ${phase}: flags=${JSON.stringify(flags)}`);

  try {
    const result = await ytDlp(url, flags, { timeout: DOWNLOAD_TIMEOUT_MS });
    if (result !== undefined && result !== null) {
      const stdoutPreview =
        typeof result === 'string' ? result : JSON.stringify(result);
      console.log(
        `${LOG_PREFIX} yt-dlp ${phase}: stdout=${stdoutPreview.slice(0, 500)}`,
      );
    }
    console.log(`${LOG_PREFIX} yt-dlp ${phase}: completed`);
    return true;
  } catch (err) {
    logYtDlpError(phase, url, err);
    return false;
  }
}

async function acceptValidatedMediaFile(
  tmpDir: string,
  config: VideoEnrichmentConfig,
  phase: string,
): Promise<string | null> {
  const mediaPath = await findDownloadedMediaFile(tmpDir);
  if (!mediaPath) {
    return null;
  }

  if (await hasAudioStream(mediaPath, config)) {
    console.log(
      `${LOG_PREFIX} yt-dlp ${phase}: validated audio stream in ${mediaPath}`,
    );
    return mediaPath;
  }

  console.log(
    `${LOG_PREFIX} yt-dlp ${phase}: rejecting download with no real audio stream: ${mediaPath}`,
  );
  await clearDownloadedMediaFiles(tmpDir);
  return null;
}

export async function extractAudioWithYtDlp(
  url: string,
  tmpDir: string,
  config: VideoEnrichmentConfig,
): Promise<string> {
  const outputTemplate = path.join(tmpDir, 'source.%(ext)s');
  const ytDlp = config.ytDlpPath
    ? createYtDlpRunner(config.ytDlpPath)
    : ytDlpExec;
  const baseFlags = buildBaseFlags(outputTemplate, config);

  console.log(`${LOG_PREFIX} yt-dlp: downloading media for ${url}`);
  console.log(
    `${LOG_PREFIX} yt-dlp: binary=${config.ytDlpPath ?? '(bundled/default)'}`,
  );
  console.log(
    `${LOG_PREFIX} yt-dlp: ffmpegLocation=${config.ffmpegLocation ?? '(unset)'}`,
  );
  console.log(
    `${LOG_PREFIX} yt-dlp: ffprobePath=${config.ffprobePath ?? '(unset)'}`,
  );
  console.log(`${LOG_PREFIX} yt-dlp: output template=${outputTemplate}`);

  const extractAudioOk = await runYtDlp(
    ytDlp,
    url,
    {
      ...baseFlags,
      extractAudio: true,
      audioFormat: 'best',
      format: FORMAT_REQUIRES_AUDIO,
    },
    'extract-audio',
  );

  if (extractAudioOk) {
    const validatedPath = await acceptValidatedMediaFile(
      tmpDir,
      config,
      'extract-audio',
    );
    if (validatedPath) {
      console.log(`${LOG_PREFIX} yt-dlp: downloaded media=${validatedPath}`);
      return validatedPath;
    }
    console.log(
      `${LOG_PREFIX} yt-dlp: extract-audio produced no file with a real audio stream`,
    );
  }

  console.log(
    `${LOG_PREFIX} yt-dlp: extract-audio failed or unusable — re-downloading with merged audio-required format`,
  );
  await clearDownloadedMediaFiles(tmpDir);

  const fallbackOk = await runYtDlp(
    ytDlp,
    url,
    { ...baseFlags, format: FORMAT_FALLBACK_MERGED },
    'fallback-merged-audio',
  );

  const fallbackMediaPath = await acceptValidatedMediaFile(
    tmpDir,
    config,
    'fallback-merged-audio',
  );
  if (fallbackMediaPath) {
    console.log(
      `${LOG_PREFIX} yt-dlp: fallback download succeeded — using direct ffmpeg extraction: ${fallbackMediaPath}`,
    );
    return fallbackMediaPath;
  }

  if (!fallbackOk) {
    throw new Error(
      'yt-dlp failed to download media with audio and no validated fallback file was found',
    );
  }

  const files = await fs.readdir(tmpDir);
  console.log(
    `${LOG_PREFIX} yt-dlp: temp dir contents=${files.join(', ') || '(empty)'}`,
  );
  throw new Error(
    'yt-dlp did not produce a downloadable media file with a validated audio stream',
  );
}
