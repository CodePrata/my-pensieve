import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';
import { VideoEnrichmentConfig } from './videoEnrichmentConfig';

const execFileAsync = promisify(execFile);

const TRANSCRIBE_TIMEOUT_MS = 600_000;
const LOG_PREFIX = '[video-enrichment]';
const FASTER_WHISPER_SCRIPT = path.join(__dirname, '..', '..', 'scripts', 'faster_whisper_transcribe.py');

async function transcribeWithWhisperCpp(wavPath: string, config: VideoEnrichmentConfig): Promise<string> {
  const args = [
    '-m',
    config.whisperModelPath!,
    '-f',
    wavPath,
    '--no-timestamps',
    '-nt',
  ];

  console.log(`${LOG_PREFIX} whisper.cpp: transcribing ${wavPath}`);
  console.log(`${LOG_PREFIX} whisper.cpp: ${config.whisperCppBin} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync(config.whisperCppBin!, args, {
      timeout: TRANSCRIBE_TIMEOUT_MS,
      encoding: 'utf-8',
    });

    if (stderr) {
      console.log(`${LOG_PREFIX} whisper.cpp stderr:\n${stderr}`);
    }

    const transcript = stdout.trim();
    console.log(
      `${LOG_PREFIX} whisper.cpp: transcript length=${transcript.length} chars`,
    );
    if (transcript) {
      console.log(`${LOG_PREFIX} whisper.cpp: preview="${transcript.slice(0, 120)}${transcript.length > 120 ? '…' : ''}"`);
    }

    return transcript;
  } catch (err) {
    const error = err as Error & { stderr?: string; stdout?: string };
    console.error(`${LOG_PREFIX} whisper.cpp failed:`, error.message);
    if (error.stderr) {
      console.error(`${LOG_PREFIX} whisper.cpp stderr:\n${error.stderr}`);
    }
    if (error.stdout) {
      console.error(`${LOG_PREFIX} whisper.cpp stdout:\n${error.stdout}`);
    }
    throw err;
  }
}

async function transcribeWithFasterWhisper(
  wavPath: string,
  config: VideoEnrichmentConfig,
): Promise<string> {
  const args = [FASTER_WHISPER_SCRIPT, config.whisperModelPath!, wavPath];

  console.log(`${LOG_PREFIX} faster-whisper: transcribing ${wavPath}`);
  console.log(`${LOG_PREFIX} faster-whisper: ${config.fasterWhisperPython} ${args.join(' ')}`);

  try {
    const { stdout, stderr } = await execFileAsync(config.fasterWhisperPython!, args, {
      timeout: TRANSCRIBE_TIMEOUT_MS,
      encoding: 'utf-8',
    });

    if (stderr) {
      console.log(`${LOG_PREFIX} faster-whisper stderr:\n${stderr}`);
    }

    const transcript = stdout.trim();
    console.log(`${LOG_PREFIX} faster-whisper: transcript length=${transcript.length} chars`);
    return transcript;
  } catch (err) {
    const error = err as Error & { stderr?: string; stdout?: string };
    console.error(`${LOG_PREFIX} faster-whisper failed:`, error.message);
    if (error.stderr) {
      console.error(`${LOG_PREFIX} faster-whisper stderr:\n${error.stderr}`);
    }
    if (error.stdout) {
      console.error(`${LOG_PREFIX} faster-whisper stdout:\n${error.stdout}`);
    }
    throw err;
  }
}

export async function transcribeWithWhisper(
  wavPath: string,
  _tmpDir: string,
  config: VideoEnrichmentConfig,
): Promise<string> {
  if (config.whisperEngine === 'faster-whisper') {
    return transcribeWithFasterWhisper(wavPath, config);
  }

  return transcribeWithWhisperCpp(wavPath, config);
}
