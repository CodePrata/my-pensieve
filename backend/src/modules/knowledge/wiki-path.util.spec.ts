import {
  buildProjectSubtopicPath,
  buildProjectWikiContext,
  buildProjectWikiLink,
  isProjectMainIndexPage,
  projectIndexFilename,
  projectMainIndexExists,
} from './wiki-path.util';

describe('projectIndexFilename', () => {
  it('joins words with hyphens preserving case', () => {
    expect(projectIndexFilename('My Pensieve')).toBe('My-Pensieve');
  });
});

describe('buildProjectWikiContext', () => {
  it('derives slug from repo name and index path from project name', () => {
    const ctx = buildProjectWikiContext('My Pensieve', 'my-pensieve');

    expect(ctx).toEqual({
      projectName: 'My Pensieve',
      projectSlug: 'my-pensieve',
      indexTitle: 'My Pensieve',
      indexFilePath: 'wiki/my-pensieve/My-Pensieve.md',
    });
  });
});

describe('buildProjectSubtopicPath', () => {
  it('places slugified titles under the project folder', () => {
    expect(buildProjectSubtopicPath('my-pensieve', 'Knowledge Inbox')).toBe(
      'wiki/my-pensieve/knowledge-inbox.md',
    );
  });
});

describe('buildProjectWikiLink', () => {
  it('uses Obsidian wiki-link syntax with vault-relative path', () => {
    expect(
      buildProjectWikiLink('my-pensieve', 'knowledge-inbox', 'Knowledge Inbox'),
    ).toBe('[[wiki/my-pensieve/knowledge-inbox|Knowledge Inbox]]');
  });
});

describe('projectMainIndexExists', () => {
  it('returns true when a page matches the index file path', () => {
    expect(
      projectMainIndexExists(
        [{ filePath: 'wiki/my-pensieve/My-Pensieve.md' }],
        'wiki/my-pensieve/My-Pensieve.md',
      ),
    ).toBe(true);
  });
});

describe('isProjectMainIndexPage', () => {
  it('returns true when the project index has not been created yet', () => {
    const ctx = buildProjectWikiContext('My Pensieve', 'my-pensieve');

    expect(isProjectMainIndexPage(ctx, [])).toBe(true);
    expect(
      isProjectMainIndexPage(ctx, [
        { filePath: 'wiki/my-pensieve/knowledge-inbox.md' },
      ]),
    ).toBe(true);
  });

  it('returns false once the main index page exists', () => {
    const ctx = buildProjectWikiContext('My Pensieve', 'my-pensieve');

    expect(
      isProjectMainIndexPage(ctx, [
        { filePath: 'wiki/my-pensieve/My-Pensieve.md' },
      ]),
    ).toBe(false);
  });
});
