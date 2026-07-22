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
  SUMMARY_PENDING_FALLBACK,
  WikiGenerationDecision,
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

interface ExistingWikiPageRef {
  title: string;
  filePath: string;
}

/** Strips `.md`, punctuation, and extra whitespace for loose title comparison. */
export function normalizeWikiTitleForMatch(value: string): string {
  return value
    .trim()
    .replace(/\.md$/i, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const MIN_SUBSTRING_MATCH_LENGTH = 4;

function normalizedTitleMatchesLoosely(
  normalizedOllama: string,
  normalizedCandidate: string,
): boolean {
  if (!normalizedCandidate || !normalizedOllama) {
    return false;
  }

  if (normalizedOllama === normalizedCandidate) {
    return true;
  }

  const [shorter, longer] =
    normalizedOllama.length <= normalizedCandidate.length
      ? [normalizedOllama, normalizedCandidate]
      : [normalizedCandidate, normalizedOllama];

  if (
    longer.startsWith(`${shorter} `) ||
    (longer.startsWith(shorter) &&
      (longer.length === shorter.length || longer[shorter.length] === ' '))
  ) {
    return true;
  }

  if (
    shorter.length >= MIN_SUBSTRING_MATCH_LENGTH &&
    (normalizedOllama.includes(normalizedCandidate) ||
      normalizedCandidate.includes(normalizedOllama))
  ) {
    return true;
  }

  return false;
}

function pageLooseMatchKeys(page: ExistingWikiPageRef): string[] {
  return [
    normalizeWikiTitleForMatch(page.title),
    normalizeWikiTitleForMatch(path.basename(page.filePath, '.md')),
  ];
}

function pickBestLooseMatch(pages: ExistingWikiPageRef[]): ExistingWikiPageRef {
  return pages.reduce((best, page) => {
    const bestKey = Math.max(...pageLooseMatchKeys(best).map((key) => key.length));
    const pageKey = Math.max(...pageLooseMatchKeys(page).map((key) => key.length));
    return pageKey > bestKey ? page : best;
  });
}

function findLoosePageMatches(
  normalizedOllama: string,
  existingPages: ExistingWikiPageRef[],
): ExistingWikiPageRef[] {
  return existingPages.filter((page) =>
    pageLooseMatchKeys(page).some((key) =>
      normalizedTitleMatchesLoosely(normalizedOllama, key),
    ),
  );
}

function resolveProjectOverviewPage(
  normalizedOllama: string,
  existingPages: ExistingWikiPageRef[],
  projectCtx: ProjectWikiContext,
): ExistingWikiPageRef | null {
  const normalizedProjectName = normalizeWikiTitleForMatch(projectCtx.projectName);
  const normalizedProjectSlug = normalizeWikiTitleForMatch(projectCtx.projectSlug);
  const matchesProjectIdentity =
    normalizedOllama === normalizedProjectName ||
    normalizedOllama === normalizedProjectSlug ||
    normalizedTitleMatchesLoosely(normalizedOllama, normalizedProjectName) ||
    normalizedTitleMatchesLoosely(normalizedOllama, normalizedProjectSlug);

  if (!matchesProjectIdentity) {
    return null;
  }

  const projectPages = existingPages.filter((page) =>
    page.filePath.startsWith(`wiki/${projectCtx.projectSlug}/`),
  );
  if (projectPages.length === 0) {
    return null;
  }

  const indexPage = projectPages.find(
    (page) => page.filePath === projectCtx.indexFilePath,
  );
  if (indexPage) {
    return indexPage;
  }

  const looseProjectMatches = projectPages.filter((page) =>
    pageLooseMatchKeys(page).some(
      (key) =>
        normalizedTitleMatchesLoosely(normalizedOllama, key) ||
        normalizedTitleMatchesLoosely(normalizedProjectName, key) ||
        normalizedTitleMatchesLoosely(normalizedProjectSlug, key),
    ),
  );
  if (looseProjectMatches.length === 1) {
    return looseProjectMatches[0];
  }
  if (looseProjectMatches.length > 1) {
    return pickBestLooseMatch(looseProjectMatches);
  }

  if (projectPages.length === 1) {
    return projectPages[0];
  }

  return pickBestLooseMatch(projectPages);
}

export function resolveAppendTargetTitle(
  ollamaTitle: string,
  existingPages: ExistingWikiPageRef[],
  projectCtx?: ProjectWikiContext | null,
): string | null {
  const trimmed = ollamaTitle.trim();

  const exactMatch = existingPages.find(
    (page) => page.title.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exactMatch) {
    return exactMatch.title;
  }

  const normalizedOllama = normalizeWikiTitleForMatch(trimmed);
  if (!normalizedOllama) {
    return null;
  }

  const normalizedExactTitleMatch = existingPages.find(
    (page) => normalizeWikiTitleForMatch(page.title) === normalizedOllama,
  );
  if (normalizedExactTitleMatch) {
    return normalizedExactTitleMatch.title;
  }

  const normalizedBasenameMatch = existingPages.find(
    (page) =>
      normalizeWikiTitleForMatch(path.basename(page.filePath, '.md')) ===
      normalizedOllama,
  );
  if (normalizedBasenameMatch) {
    return normalizedBasenameMatch.title;
  }

  const prefixMatches = findLoosePageMatches(normalizedOllama, existingPages);
  if (prefixMatches.length === 1) {
    return prefixMatches[0].title;
  }
  if (prefixMatches.length > 1) {
    return pickBestLooseMatch(prefixMatches).title;
  }

  if (projectCtx) {
    const projectOverview = resolveProjectOverviewPage(
      normalizedOllama,
      existingPages,
      projectCtx,
    );
    if (projectOverview) {
      return projectOverview.title;
    }
  }

  return null;
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
    const parsedDecision = parseWikiGenerationResponse(rawResponse);
    let decision: WikiGenerationDecision;
    if (parsedDecision.action === 'append') {
      decision = this.resolveAppendDecision(
        parsedDecision,
        existingPages,
        projectCtx,
      );
    } else {
      decision = {
        ...parsedDecision,
        summary:
          parsedDecision.summary?.trim() ||
          parsedDecision.title?.trim() ||
          SUMMARY_PENDING_FALLBACK,
      };
    }

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

  private resolveAppendDecision(
    decision: Extract<WikiGenerationDecision, { action: 'append' }>,
    existingPages: { id: string; title: string; filePath: string }[],
    projectCtx: ProjectWikiContext | null,
  ): Extract<WikiGenerationDecision, { action: 'append' }> {
    const resolvedTitle = resolveAppendTargetTitle(
      decision.title,
      existingPages,
      projectCtx,
    );
    if (!resolvedTitle) {
      throw new Error(
        `Ollama selected an append title not in the existing list: "${decision.title}"`,
      );
    }

    return { ...decision, title: resolvedTitle };
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
