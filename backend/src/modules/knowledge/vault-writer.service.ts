import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

function filenameTimestampStem(date: Date): string {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replace(/[:-]/g, '');
}

function toFrontmatterYaml(frontmatter: Record<string, unknown>): string {
  const lines = Object.entries(frontmatter).map(
    ([key, value]) => `${key}: ${JSON.stringify(value)}`,
  );
  return `---\n${lines.join('\n')}\n---\n`;
}

@Injectable()
export class VaultWriterService {
  async writeGithubRawFile(
    vaultPath: string,
    repoUrl: string,
    filenameStem: string,
    body: string,
  ): Promise<string> {
    const relativeDir = path.join('raw', 'github');
    const absoluteDir = path.join(vaultPath, relativeDir);
    await fs.mkdir(absoluteDir, { recursive: true });

    const relativeFilePath = path.join(relativeDir, `${filenameStem}.md`);
    const absoluteFilePath = path.join(vaultPath, relativeFilePath);

    const frontmatter = {
      capturedAt: new Date().toISOString(),
      sourceType: 'github',
      captureMethod: 'batch_import',
      sourceUrl: repoUrl,
      processed: false,
    };

    const content = `${toFrontmatterYaml(frontmatter)}\n${body}\n`;
    await fs.writeFile(absoluteFilePath, content, 'utf-8');

    return relativeFilePath.split(path.sep).join('/');
  }
}

export { filenameTimestampStem };
