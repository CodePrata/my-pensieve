import {
  buildWikiGenerationPrompt,
  parseWikiGenerationResponse,
} from './wiki-generation-template';

describe('buildWikiGenerationPrompt', () => {
  it('lists existing titles when present', () => {
    const prompt = buildWikiGenerationPrompt(
      ['Networking', 'Prisma'],
      'some content',
    );
    expect(prompt).toContain('- Networking');
    expect(prompt).toContain('- Prisma');
    expect(prompt).toContain('some content');
  });

  it('signals no existing pages when list is empty', () => {
    const prompt = buildWikiGenerationPrompt([], 'some content');
    expect(prompt).toContain('(none yet)');
  });

  it('includes project context when provided', () => {
    const prompt = buildWikiGenerationPrompt([], 'some content', {
      projectName: 'My Pensieve',
      indexTitle: 'My Pensieve',
    });
    expect(prompt).toContain('My Pensieve');
    expect(prompt).toContain('main project overview page');
  });
});

describe('parseWikiGenerationResponse', () => {
  it('parses a valid append decision without resolving titles', () => {
    const response = JSON.stringify({
      action: 'append',
      title: 'networking basics',
      summary: 'Refreshed summary.',
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision).toEqual({
      action: 'append',
      title: 'networking basics',
      summary: 'Refreshed summary.',
    });
  });

  it('parses an append decision with no refreshed summary as null', () => {
    const response = JSON.stringify({
      action: 'append',
      title: 'Networking Basics',
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision.summary).toBeNull();
  });

  it('parses a valid new-page decision', () => {
    const response = JSON.stringify({
      action: 'new',
      title: 'Rust Ownership',
      summary: 'A summary of ownership semantics.',
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision).toEqual({
      action: 'new',
      title: 'Rust Ownership',
      summary: 'A summary of ownership semantics.',
    });
  });

  it('throws when the response is not valid JSON', () => {
    expect(() => parseWikiGenerationResponse('not json at all')).toThrow(
      /not valid JSON/,
    );
  });

  it('throws when a new-page decision is missing a summary', () => {
    const response = JSON.stringify({ action: 'new', title: 'New Topic' });

    expect(() => parseWikiGenerationResponse(response)).toThrow(
      /missing a summary/,
    );
  });

  it('throws on an unrecognized action', () => {
    const response = JSON.stringify({ action: 'delete', title: 'X' });

    expect(() => parseWikiGenerationResponse(response)).toThrow(
      /unrecognized action/,
    );
  });
});
