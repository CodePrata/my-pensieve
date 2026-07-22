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

  it('falls back to the title when a new-page decision has no summary', () => {
    const response = JSON.stringify({ action: 'new', title: 'New Topic' });

    const decision = parseWikiGenerationResponse(response);

    expect(decision).toEqual({
      action: 'new',
      title: 'New Topic',
      summary: 'New Topic',
    });
  });

  it('falls back to the title when a new-page decision has a null summary', () => {
    const response = JSON.stringify({
      action: 'new',
      title: 'Test Note Page',
      summary: null,
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision).toEqual({
      action: 'new',
      title: 'Test Note Page',
      summary: 'Test Note Page',
    });
  });

  it('falls back to the title when a new-page decision has an empty summary', () => {
    const response = JSON.stringify({
      action: 'new',
      title: 'Empty Summary Page',
      summary: '   ',
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision).toEqual({
      action: 'new',
      title: 'Empty Summary Page',
      summary: 'Empty Summary Page',
    });
  });


  it('treats an append decision with an empty summary as null', () => {
    const response = JSON.stringify({
      action: 'append',
      title: 'Networking Basics',
      summary: '   ',
    });

    const decision = parseWikiGenerationResponse(response);

    expect(decision.summary).toBeNull();
  });

  it('throws on an unrecognized action', () => {
    const response = JSON.stringify({ action: 'delete', title: 'X' });

    expect(() => parseWikiGenerationResponse(response)).toThrow(
      /unrecognized action/,
    );
  });
});
