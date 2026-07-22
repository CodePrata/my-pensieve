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

const PROJECT_SUBPAGES_SECTION = '## Sub-pages';

@Injectable()
export class VaultWriterService {
  async ensureWikiDirectory(
    vaultPath: string,
    relativeFilePath: string,
  ): Promise<void> {
    const absolutePath = path.join(vaultPath, relativeFilePath);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  }

  async writeWikiFile(
    vaultPath: string,
    relativeFilePath: string,
    content: string,
  ): Promise<void> {
    await this.ensureWikiDirectory(vaultPath, relativeFilePath);
    await fs.writeFile(
      path.join(vaultPath, relativeFilePath),
      content,
      'utf-8',
    );
  }

  async appendWikiFile(
    vaultPath: string,
    relativeFilePath: string,
    content: string,
  ): Promise<void> {
    await fs.appendFile(
      path.join(vaultPath, relativeFilePath),
      content,
      'utf-8',
    );
  }

  async appendProjectSubtopicLink(
    vaultPath: string,
    indexFilePath: string,
    wikiLink: string,
  ): Promise<void> {
    const absolutePath = path.join(vaultPath, indexFilePath);
    const content = await fs.readFile(absolutePath, 'utf-8');

    if (content.includes(wikiLink)) {
      return;
    }

    if (content.includes(PROJECT_SUBPAGES_SECTION)) {
      await this.appendWikiFile(
        vaultPath,
        indexFilePath,
        `\n- ${wikiLink}\n`,
      );
      return;
    }

    await this.appendWikiFile(
      vaultPath,
      indexFilePath,
      `\n${PROJECT_SUBPAGES_SECTION}\n\n- ${wikiLink}\n`,
    );
  }

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
