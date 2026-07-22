import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { extractAudioWithYtDlp } from './extractAudioWithYtDlp';
import { isMeaningfulTranscript } from './isMeaningfulTranscript';
import { normalizeAudioToWav } from './normalizeAudioToWav';
import { transcribeWithWhisper } from './transcribeWithWhisper';
import { appendVideoTranscriptSection } from './vaultWriter';
import {
  isVideoEnrichmentConfigured,
  VideoEnrichmentConfig,
} from './videoEnrichmentConfig';

const LOG_PREFIX = '[video-enrichment]';

function logConfig(config: VideoEnrichmentConfig): void {
  console.log(`${LOG_PREFIX} config:`, {
    enabled: config.enabled,
    whisperEngine: config.whisperEngine,
    whisperCppBin: config.whisperCppBin ?? '(unset)',
    whisperModelPath: config.whisperModelPath ?? '(unset)',
    fasterWhisperPython: config.fasterWhisperPython ?? '(unset)',
    ytDlpPath: config.ytDlpPath ?? '(default PATH)',
    ffmpegPath: config.ffmpegPath ?? '(unset)',
    ffprobePath: config.ffprobePath ?? '(unset)',
    ffmpegLocation: config.ffmpegLocation ?? '(unset)',
  });
}

/**
 * ADR-018: asynchronously download video audio, transcribe locally, and append
 * a ## Video Transcript section to the saved note. Failures are logged only.
 */
export async function enrichVideoNoteWithTranscript(
  notePath: string,
  url: string,
  config: VideoEnrichmentConfig,
): Promise<void> {
  if (!isVideoEnrichmentConfigured(config)) {
    console.log(
      `${LOG_PREFIX} Skipping enrichment — transcription is not fully configured`,
    );
    logConfig(config);
    return;
  }

  let tmpDir: string | undefined;

  console.log(`${LOG_PREFIX} Starting enrichment for ${url}`);
  console.log(`${LOG_PREFIX} Note path: ${notePath}`);
  logConfig(config);

  try {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'capture-bot-audio-'));
    console.log(`${LOG_PREFIX} Created temp dir: ${tmpDir}`);

    console.log(`${LOG_PREFIX} Step 1/3: downloading media with yt-dlp`);
    const rawMediaPath = await extractAudioWithYtDlp(url, tmpDir, config);

    console.log(
      `${LOG_PREFIX} Step 2/3: extracting/normalizing audio to 16 kHz mono WAV via ffmpeg`,
    );
    const wavPath = await normalizeAudioToWav(rawMediaPath, tmpDir, config);
    if (!wavPath) {
      return;
    }

    console.log(
      `${LOG_PREFIX} Step 3/3: transcribing with ${config.whisperEngine}`,
    );
    const transcript = await transcribeWithWhisper(wavPath, tmpDir, config);

    if (!transcript) {
      console.log(`${LOG_PREFIX} Whisper returned empty stdout for ${url}`);
      return;
    }

    if (!isMeaningfulTranscript(transcript)) {
      console.log(
        `${LOG_PREFIX} Ignoring empty/noise transcript for ${url}: "${transcript.slice(0, 80)}"`,
      );
      return;
    }

    console.log(`${LOG_PREFIX} Appending ## Video Transcript to ${notePath}`);
    await appendVideoTranscriptSection(notePath, transcript);
    console.log(
      `${LOG_PREFIX} Success — appended ${transcript.length} chars to ${notePath}`,
    );
  } catch (err) {
    const error = err as Error & { stderr?: string; stdout?: string };
    console.error(`${LOG_PREFIX} Pipeline failed for ${url}:`, error.message);
    if (error.stack) {
      console.error(`${LOG_PREFIX} Stack:`, error.stack);
    }
    if (error.stderr) {
      console.error(`${LOG_PREFIX} Process stderr:\n${error.stderr}`);
    }
    if (error.stdout) {
      console.error(`${LOG_PREFIX} Process stdout:\n${error.stdout}`);
    }
  } finally {
    if (tmpDir) {
      console.log(`${LOG_PREFIX} Cleaning up temp dir: ${tmpDir}`);
      await fs
        .rm(tmpDir, { recursive: true, force: true })
        .catch((cleanupErr) => {
          console.error(
            `${LOG_PREFIX} Temp cleanup failed for ${tmpDir}:`,
            cleanupErr,
          );
        });
    }
  }
}
