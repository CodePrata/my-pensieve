import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from '@octokit/rest';
import { PrismaService } from '../../prisma/prisma.service';
import { parseRepoUrl } from './github-repo.util';
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
const MAX_FILES_PER_COMMIT = 25;

interface CommitFileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
}

function formatCommitEntry(
  sha: string,
  author: string,
  date: string,
  messageFirstLine: string,
  files: CommitFileChange[],
): string {
  const header = `- **${sha}** ${author} ${date} — ${messageFirstLine}`;
  if (files.length === 0) {
    return `${header}\n  - _(no file changes recorded)_`;
  }

  const visibleFiles = files.slice(0, MAX_FILES_PER_COMMIT);
  const fileLines = visibleFiles.map(
    (file) =>
      `  - \`${file.filename}\` ${file.status} +${file.additions} / -${file.deletions}`,
  );

  if (files.length > MAX_FILES_PER_COMMIT) {
    fileLines.push(
      `  - _…and ${files.length - MAX_FILES_PER_COMMIT} more files_`,
    );
  }

  return [header, ...fileLines].join('\n');
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

    const commitRef = await this.resolveCommitRef(octokit, owner, repo);
    const lastSyncDate = lastRawItem.capturedAt;
    const { data: commits } = await octokit.rest.repos.listCommits({
      owner,
      repo,
      sha: commitRef,
      since: lastSyncDate.toISOString(),
    });

    if (commits.length === 0) {
      return false;
    }

    const commitEntries = await Promise.all(
      [...commits].reverse().map(async (commit) => {
        const { data: detail } = await octokit.rest.repos.getCommit({
          owner,
          repo,
          ref: commit.sha,
        });

        const sha = commit.sha.slice(0, 7);
        const author =
          commit.commit.author?.name ?? commit.author?.login ?? 'unknown';
        const date = commit.commit.author?.date ?? '';
        const messageFirstLine = commit.commit.message.split('\n')[0];
        const files = (detail.files ?? []).map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions ?? 0,
          deletions: file.deletions ?? 0,
        }));

        return formatCommitEntry(
          sha,
          author,
          date,
          messageFirstLine,
          files,
        );
      }),
    );
    const body = commitEntries.join('\n\n');

    await this.vaultWriter.writeGithubRawFile(
      vaultPath,
      repoUrl,
      filenameStem,
      body,
    );
    return true;
  }

  private async resolveCommitRef(
    octokit: Octokit,
    owner: string,
    repo: string,
  ): Promise<string> {
    try {
      await octokit.rest.repos.getBranch({ owner, repo, branch: 'develop' });
      return 'develop';
    } catch {
      const { data } = await octokit.rest.repos.get({ owner, repo });
      return data.default_branch;
    }
  }
}
