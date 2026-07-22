import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import * as path from 'path';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaClientService } from '../ollama/ollama-client.service';
import { parseRepoUrl } from './github-repo.util';
import { VaultWriterService } from './vault-writer.service';
import {
  buildWikiGenerationPrompt,
  parseWikiGenerationResponse,
} from './wiki-generation-template';
import {
  buildProjectSubtopicPath,
  buildProjectWikiContext,
  buildProjectWikiLink,
  isProjectMainIndexPage,
  ProjectWikiContext,
} from './wiki-path.util';
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
    private readonly vaultWriter: VaultWriterService,
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
    rawItem: {
      id: string;
      rawFilePath: string;
      sourceType: string;
      sourceUrl: string | null;
    },
  ): Promise<void> {
    const absoluteRawPath = path.join(vaultPath, rawItem.rawFilePath);
    const rawFileContent = await fs.readFile(absoluteRawPath, 'utf-8');
    const { content: rawBody } = matter(rawFileContent);

    const projectCtx = await this.resolveProjectWikiContext(rawItem);

    const existingPages = await this.prisma.wikiPage.findMany({
      select: { id: true, title: true, filePath: true },
    });
    const existingTitles = existingPages.map((page) => page.title);

    const prompt = buildWikiGenerationPrompt(
      existingTitles,
      rawBody.trim(),
      projectCtx
        ? {
            projectName: projectCtx.projectName,
            indexTitle: projectCtx.indexTitle,
          }
        : undefined,
    );
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

      const section = `\n## ${dateStamp} — ${rawItem.rawFilePath}\n\n${rawBody.trim()}\n`;
      await this.vaultWriter.appendWikiFile(
        vaultPath,
        targetPage.filePath,
        section,
      );

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
      const createAsMainIndex =
        projectCtx !== null &&
        isProjectMainIndexPage(projectCtx, existingPages);

      const pageTitle = createAsMainIndex
        ? projectCtx.indexTitle
        : decision.title;
      const filePath = createAsMainIndex
        ? projectCtx.indexFilePath
        : await this.reserveWikiFilePath(decision.title, projectCtx);

      const initialContent = `# ${pageTitle}\n\n${decision.summary}\n`;
      await this.vaultWriter.writeWikiFile(vaultPath, filePath, initialContent);

      const createdPage = await this.prisma.wikiPage.create({
        data: {
          title: pageTitle,
          filePath,
          summary: decision.summary,
          lastUpdatedAt: now,
        },
      });

      if (projectCtx && !createAsMainIndex) {
        const featureStem = path.basename(filePath, '.md');
        const wikiLink = buildProjectWikiLink(
          projectCtx.projectSlug,
          featureStem,
          decision.title,
        );
        await this.vaultWriter.appendProjectSubtopicLink(
          vaultPath,
          projectCtx.indexFilePath,
          wikiLink,
        );
      }

      await this.prisma.wikiPageSource.create({
        data: { rawItemId: rawItem.id, wikiPageId: createdPage.id },
      });
    }

    await this.prisma.rawItem.update({
      where: { id: rawItem.id },
      data: { processed: true },
    });
  }

  private async resolveProjectWikiContext(rawItem: {
    sourceType: string;
    sourceUrl: string | null;
  }): Promise<ProjectWikiContext | null> {
    if (rawItem.sourceType !== 'github' || !rawItem.sourceUrl) {
      return null;
    }

    const project = await this.prisma.project.findFirst({
      where: { repoUrl: rawItem.sourceUrl },
      select: { name: true, repoUrl: true },
    });
    if (!project) {
      return null;
    }

    const { repo } = parseRepoUrl(project.repoUrl);
    return buildProjectWikiContext(project.name, repo);
  }

  private async reserveWikiFilePath(
    title: string,
    projectCtx: ProjectWikiContext | null,
  ): Promise<string> {
    if (projectCtx) {
      return this.reserveUniqueFilePath(
        buildProjectSubtopicPath(projectCtx.projectSlug, title),
      );
    }

    const slug = slugifyTitle(title);
    return this.reserveUniqueFilePath(`wiki/${slug}.md`);
  }

  private async reserveUniqueFilePath(candidate: string): Promise<string> {
    const existing = await this.prisma.wikiPage.findUnique({
      where: { filePath: candidate },
    });
    if (!existing) {
      return candidate;
    }

    const parsed = path.parse(candidate);
    const suffix = Date.now().toString(36);
    return path
      .join(parsed.dir, `${parsed.name}-${suffix}${parsed.ext}`)
      .split(path.sep)
      .join('/');
  }
}
