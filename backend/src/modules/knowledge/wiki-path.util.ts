import { slugifyTitle } from './wiki-slug.util';

export interface ProjectWikiContext {
  projectName: string;
  projectSlug: string;
  indexTitle: string;
  indexFilePath: string;
}

/** Filename stem for the main project index (e.g. "My Pensieve" → "My-Pensieve"). */
export function projectIndexFilename(projectName: string): string {
  return projectName.trim().replace(/\s+/g, '-');
}

export function buildProjectWikiContext(
  projectName: string,
  repoName: string,
): ProjectWikiContext {
  const projectSlug = slugifyTitle(repoName);
  const indexFilePath = `wiki/${projectSlug}/${projectIndexFilename(projectName)}.md`;

  return {
    projectName,
    projectSlug,
    indexTitle: projectName,
    indexFilePath,
  };
}

export function buildProjectSubtopicPath(
  projectSlug: string,
  title: string,
): string {
  return `wiki/${projectSlug}/${slugifyTitle(title)}.md`;
}

export function buildProjectWikiLink(
  projectSlug: string,
  featureFilenameStem: string,
  displayTitle: string,
): string {
  return `[[wiki/${projectSlug}/${featureFilenameStem}|${displayTitle}]]`;
}

export function projectMainIndexExists(
  existingPages: { filePath: string }[],
  indexFilePath: string,
): boolean {
  return existingPages.some((page) => page.filePath === indexFilePath);
}

export function isProjectMainIndexPage(
  projectCtx: ProjectWikiContext,
  existingPages: { filePath: string }[],
): boolean {
  return !projectMainIndexExists(existingPages, projectCtx.indexFilePath);
}
