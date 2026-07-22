import * as path from 'path';

export interface FfmpegToolPaths {
  ffmpegPath?: string;
  ffprobePath?: string;
  /** Directory passed to yt-dlp `--ffmpeg-location` (must contain ffmpeg + ffprobe). */
  ffmpegLocation?: string;
}

export function deriveFfprobePathFromFfmpeg(ffmpegPath: string): string {
  return ffmpegPath.replace(/ffmpeg(\.exe)?$/i, 'ffprobe$1');
}

export function resolveFfmpegTools(
  ffmpegPath?: string,
  ffprobePath?: string,
): FfmpegToolPaths {
  if (!ffmpegPath) {
    return { ffprobePath };
  }

  const resolvedFfprobe =
    ffprobePath ?? deriveFfprobePathFromFfmpeg(ffmpegPath);
  const ffmpegLocation = path.dirname(ffmpegPath);

  return {
    ffmpegPath,
    ffprobePath: resolvedFfprobe,
    ffmpegLocation,
  };
}
