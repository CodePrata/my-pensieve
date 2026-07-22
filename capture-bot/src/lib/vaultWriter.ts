import * as fs from 'fs/promises';
import * as path from 'path';
import { CaptureResult, SourceType } from '../types';

export function filenameStemFromDate(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:-]/g, '');
}

function toFrontmatterYaml(frontmatter: Record<string, unknown>): string {
  const lines = Object.entries(frontmatter).map(([key, value]) => {
    if (typeof value === 'string') {
      return `${key}: ${JSON.stringify(value)}`;
    }
    return `${key}: ${JSON.stringify(value)}`;
  });
  return `---\n${lines.join('\n')}\n---\n`;
}

export async function writeRawFile(
  vaultPath: string,
  sourceType: SourceType,
  filenameStem: string,
  frontmatter: Record<string, unknown>,
  body: string,
): Promise<string> {
  const relativeDir = path.join('raw', sourceType);
  const absoluteDir = path.join(vaultPath, relativeDir);
  await fs.mkdir(absoluteDir, { recursive: true });

  const relativeFilePath = path.join(relativeDir, `${filenameStem}.md`);
  const absoluteFilePath = path.join(vaultPath, relativeFilePath);

  const content = `${toFrontmatterYaml(frontmatter)}\n${body}\n`;
  await fs.writeFile(absoluteFilePath, content, 'utf-8');

  return relativeFilePath.split(path.sep).join('/');
}

export async function appendLog(
  vaultPath: string,
  entry: CaptureResult,
): Promise<void> {
  const logPath = path.join(vaultPath, 'log.md');
  const sourceUrlSuffix = entry.sourceUrl ? ` (${entry.sourceUrl})` : '';
  const line = `- [${entry.capturedAt}] ${entry.sourceType} — ${entry.rawFilePath}${sourceUrlSuffix}\n`;

  const handle = await fs.open(logPath, 'a');
  try {
    await handle.appendFile(line, 'utf-8');
  } finally {
    await handle.close();
  }
}

export async function appendVideoTranscriptSection(
  notePath: string,
  transcript: string,
): Promise<void> {
  const section = `\n## Video Transcript\n\n${transcript.trim()}\n`;
  await fs.appendFile(notePath, section, 'utf-8');
}
