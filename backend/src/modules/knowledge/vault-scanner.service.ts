import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import * as path from 'path';

export interface ParsedRawFile {
  sourceType: string;
  captureMethod: string;
  sourceUrl: string | null;
  rawFilePath: string;
  capturedAt: Date;
}

@Injectable()
export class VaultScannerService {
  private readonly logger = new Logger(VaultScannerService.name);

  constructor(private readonly configService: ConfigService) {}

  async scanRawFolder(): Promise<ParsedRawFile[]> {
    const vaultPath = this.configService.get<string>('OBSIDIAN_VAULT_PATH');
    if (!vaultPath) {
      throw new Error(
        'OBSIDIAN_VAULT_PATH is not set — cannot scan the vault raw/ folder.',
      );
    }

    const rawRoot = path.join(vaultPath, 'raw');
    const files = await this.findMarkdownFiles(rawRoot);

    const parsed: ParsedRawFile[] = [];
    for (const absolutePath of files) {
      const relativePath = path
        .relative(vaultPath, absolutePath)
        .split(path.sep)
        .join('/');

      try {
        const content = await fs.readFile(absolutePath, 'utf-8');
        const { data } = matter(content);

        if (
          typeof data.sourceType !== 'string' ||
          typeof data.captureMethod !== 'string' ||
          typeof data.capturedAt !== 'string'
        ) {
          this.logger.warn(
            `Skipping ${relativePath}: missing/malformed frontmatter (sourceType/captureMethod/capturedAt required)`,
          );
          continue;
        }

        const capturedAt = new Date(data.capturedAt);
        if (Number.isNaN(capturedAt.getTime())) {
          this.logger.warn(
            `Skipping ${relativePath}: capturedAt is not a valid date`,
          );
          continue;
        }

        parsed.push({
          sourceType: data.sourceType,
          captureMethod: data.captureMethod,
          sourceUrl: typeof data.sourceUrl === 'string' ? data.sourceUrl : null,
          rawFilePath: relativePath,
          capturedAt,
        });
      } catch (error) {
        this.logger.warn(
          `Skipping ${relativePath}: failed to read/parse — ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return parsed;
  }

  private async findMarkdownFiles(dir: string): Promise<string[]> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
      this.logger.warn(
        `Vault raw/ folder not found at ${dir} — treating as empty (${
          error instanceof Error ? error.message : String(error)
        })`,
      );
      return [];
    }

    const files: string[] = [];
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await this.findMarkdownFiles(fullPath)));
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
    return files;
  }
}
