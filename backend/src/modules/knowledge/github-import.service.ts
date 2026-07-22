import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { PrismaService } from '../../prisma/prisma.service';
import { filenameTimestampStem, VaultWriterService } from './vault-writer.service';

export interface GithubSyncFailure {
  repoUrl: string;
  reason: string;
}

export interface GithubSyncResult {
  reposChecked: number;
  filesWritten: number;
  failures: GithubSyncFailure[];
}

interface ParsedRepo {
  owner: string;
  repo: string;
}

const GITHUB_URL_PATTERN = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

function parseRepoUrl(repoUrl: string): ParsedRepo {
  const match = GITHUB_URL_PATTERN.exec(repoUrl.trim());
  if (!match) {
    throw new Error(`Could not parse owner/repo from repoUrl "${repoUrl}"`);
  }
  return { owner: match[1], repo: match[2] };
}

@Injectable()
export class GithubImportService {
  private readonly logger = new Logger(GithubImportService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly vaultWriter: VaultWriterService,
  ) {}

  async syncGithubSources(): Promise<GithubSyncResult> {
    const vaultPath = this.configService.get<string>('OBSIDIAN_VAULT_PATH');
    if (!vaultPath) {
      throw new Error(
        'OBSIDIAN_VAULT_PATH is not set — cannot write GitHub raw files.',
      );
    }

    const token = this.configService.get<string>('GITHUB_TOKEN');
    if (!token) {
      throw new Error('GITHUB_TOKEN is not set — cannot sync GitHub sources.');
    }

    const octokit = new Octokit({ auth: token });

    const projects = await this.prisma.project.findMany({
      select: { repoUrl: true },
    });
    const repoUrls = Array.from(
      new Set(projects.map((project) => project.repoUrl)),
    );

    let filesWritten = 0;
    const failures: GithubSyncFailure[] = [];

    for (const repoUrl of repoUrls) {
      try {
        const written = await this.syncOneRepo(octokit, vaultPath, repoUrl);
        if (written) {
          filesWritten++;
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.logger.warn(`GitHub sync failed for ${repoUrl}: ${reason}`);
        failures.push({ repoUrl, reason });
      }
    }

    return { reposChecked: repoUrls.length, filesWritten, failures };
  }

  private async syncOneRepo(
    octokit: Octokit,
    vaultPath: string,
    repoUrl: string,
  ): Promise<boolean> {
    const { owner, repo } = parseRepoUrl(repoUrl);

    const lastRawItem = await this.prisma.rawItem.findFirst({
      where: { sourceType: 'github', sourceUrl: repoUrl },
      orderBy: { capturedAt: 'desc' },
    });

    const filenameStem = `${owner}-${repo}-${filenameTimestampStem(new Date())}`;

    if (!lastRawItem) {
      const { data: readme } = await octokit.rest.repos.getReadme({
        owner,
        repo,
      });
      const content = Buffer.from(readme.content, 'base64').toString('utf-8');
      const body = `Initial baseline capture (README)\n\n${content}`;

      await this.vaultWriter.writeGithubRawFile(
        vaultPath,
        repoUrl,
        filenameStem,
        body,
      );
      return true;
    }

    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      since: lastRawItem.capturedAt.toISOString(),
    });

    if (commits.length === 0) {
      return false;
    }

    const lines = [...commits].reverse().map((commit) => {
      const sha = commit.sha.slice(0, 7);
      const author =
        commit.commit.author?.name ?? commit.author?.login ?? 'unknown';
      const date = commit.commit.author?.date ?? '';
      const messageFirstLine = commit.commit.message.split('\n')[0];
      return `- ${sha} ${author} ${date} — ${messageFirstLine}`;
    });
    const body = lines.join('\n');

    await this.vaultWriter.writeGithubRawFile(
      vaultPath,
      repoUrl,
      filenameStem,
      body,
    );
    return true;
  }
}
