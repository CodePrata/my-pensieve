export interface ParsedRepo {
  owner: string;
  repo: string;
}

const GITHUB_URL_PATTERN = /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/;

export function parseRepoUrl(repoUrl: string): ParsedRepo {
  const match = GITHUB_URL_PATTERN.exec(repoUrl.trim());
  if (!match) {
    throw new Error(`Could not parse owner/repo from repoUrl "${repoUrl}"`);
  }
  return { owner: match[1], repo: match[2] };
}
