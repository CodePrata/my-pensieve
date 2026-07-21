import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaClientService } from '../ollama/ollama-client.service';
import {
  buildWikiGenerationPrompt,
  parseWikiGenerationResponse,
} from './wiki-generation-template';
import { slugifyTitle } from './wiki-slug.util';

export interface ProcessInboxFailure {
  rawItemId: string;
  reason: string;
}

export interface ProcessInboxResult {
  processed: number;
  failed: number;
  failures: ProcessInboxFailure[];
}

@Injectable()
export class WikiGeneratorService {
  private readonly logger = new Logger(WikiGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly ollamaClient: OllamaClientService,
  ) {}

  async processInbox(): Promise<ProcessInboxResult> {
    const vaultPath = this.configService.get<string>('OBSIDIAN_VAULT_PATH');
    if (!vaultPath) {
      throw new Error(
        'OBSIDIAN_VAULT_PATH is not set — cannot process the inbox.',
      );
    }

    const unprocessed = await this.prisma.rawItem.findMany({
      where: { processed: false },
      orderBy: { capturedAt: 'asc' },
    });

    let processed = 0;
    const failures: ProcessInboxFailure[] = [];

    for (const rawItem of unprocessed) {
      try {
        await this.processOne(vaultPath, rawItem);
        processed++;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Failed to process RawItem ${rawItem.id} (${rawItem.rawFilePath}): ${reason}`,
        );
        failures.push({ rawItemId: rawItem.id, reason });
      }
    }

    return { processed, failed: failures.length, failures };
  }

  private async processOne(
    vaultPath: string,
    rawItem: { id: string; rawFilePath: string },
  ): Promise<void> {
    const absoluteRawPath = path.join(vaultPath, rawItem.rawFilePath);
    const rawFileContent = await fs.readFile(absoluteRawPath, 'utf-8');
    const { content: rawBody } = matter(rawFileContent);

    const existingPages = await this.prisma.wikiPage.findMany({
      select: { id: true, title: true, filePath: true },
    });
    const existingTitles = existingPages.map((page) => page.title);

    const prompt = buildWikiGenerationPrompt(existingTitles, rawBody.trim());
    const rawResponse = await this.ollamaClient.generate(prompt);
    const decision = parseWikiGenerationResponse(rawResponse, existingTitles);

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10);

    if (decision.action === 'append') {
      const targetPage = existingPages.find(
        (page) => page.title === decision.title,
      );
      if (!targetPage) {
        throw new Error(
          `Resolved append title "${decision.title}" has no matching WikiPage row`,
        );
      }

      const absoluteWikiPath = path.join(vaultPath, targetPage.filePath);
      const section = `\n## ${dateStamp} — ${rawItem.rawFilePath}\n\n${rawBody.trim()}\n`;
      await fs.appendFile(absoluteWikiPath, section, 'utf-8');

      await this.prisma.wikiPage.update({
        where: { id: targetPage.id },
        data: {
          lastUpdatedAt: now,
          ...(decision.summary ? { summary: decision.summary } : {}),
        },
      });

      await this.prisma.wikiPageSource.create({
        data: { rawItemId: rawItem.id, wikiPageId: targetPage.id },
      });
    } else {
      const filePath = await this.reserveWikiFilePath(decision.title);
      const absoluteWikiPath = path.join(vaultPath, filePath);
      await fs.mkdir(path.dirname(absoluteWikiPath), { recursive: true });
      const initialContent = `# ${decision.title}\n\n${decision.summary}\n`;
      await fs.writeFile(absoluteWikiPath, initialContent, 'utf-8');

      const createdPage = await this.prisma.wikiPage.create({
        data: {
          title: decision.title,
          filePath,
          summary: decision.summary,
          lastUpdatedAt: now,
        },
      });

      await this.prisma.wikiPageSource.create({
        data: { rawItemId: rawItem.id, wikiPageId: createdPage.id },
      });
    }

    await this.prisma.rawItem.update({
      where: { id: rawItem.id },
      data: { processed: true },
    });
  }

  private async reserveWikiFilePath(title: string): Promise<string> {
    const slug = slugifyTitle(title);
    let candidate = `wiki/${slug}.md`;

    const existing = await this.prisma.wikiPage.findUnique({
      where: { filePath: candidate },
    });
    if (!existing) {
      return candidate;
    }

    candidate = `wiki/${slug}-${Date.now().toString(36)}.md`;
    return candidate;
  }
}
