import { execFile } from 'child_process';
import { VideoEnrichmentConfig } from './videoEnrichmentConfig';

const PROBE_TIMEOUT_MS = 30_000;
const LOG_PREFIX = '[video-enrichment]';

function runFfprobe(
  ffprobeBin: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(
      ffprobeBin,
      args,
      { encoding: 'utf-8', timeout: PROBE_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          reject(
            error instanceof Error
              ? error
              : new Error(
                  typeof error === 'string' ? error : 'ffprobe command failed',
                ),
          );
          return;
        }
        resolve({ stdout: stdout ?? '', stderr: stderr ?? '' });
      },
    );
  });
}

/**
 * Uses ffprobe to verify the downloaded file actually contains an audio stream.
 * TikTok manifests may lie about acodec metadata; this checks the file bytes.
 */
export async function hasAudioStream(
  mediaPath: string,
  config: VideoEnrichmentConfig,
): Promise<boolean> {
  const ffprobeBin = config.ffprobePath ?? 'ffprobe';

  console.log(
    `${LOG_PREFIX} ffprobe: checking for audio stream in ${mediaPath}`,
  );

  try {
    const { stdout, stderr } = await runFfprobe(ffprobeBin, [
      '-v',
      'error',
      '-select_streams',
      'a',
      '-show_entries',
      'stream=codec_type',
      '-of',
      'csv=p=0',
      mediaPath,
    ]);

    if (stderr) {
      console.log(`${LOG_PREFIX} ffprobe stderr:\n${stderr}`);
    }

    const hasAudio = stdout
      .trim()
      .split('\n')
      .some((line) => line.trim() === 'audio');
    console.log(
      `${LOG_PREFIX} ffprobe: audio stream ${hasAudio ? 'found' : 'not found'} in ${mediaPath}`,
    );
    return hasAudio;
  } catch (err) {
    const error = err as Error & { stderr?: string; stdout?: string };
    console.log(
      `${LOG_PREFIX} ffprobe: no audio stream detected in ${mediaPath} (${error.message})`,
    );
    if (error.stderr) {
      console.log(`${LOG_PREFIX} ffprobe stderr:\n${error.stderr}`);
    }
    return false;
  }
}
