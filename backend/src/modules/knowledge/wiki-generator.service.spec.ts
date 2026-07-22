import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { VaultWriterService } from './vault-writer.service';
import {
  normalizeWikiTitleForMatch,
  resolveAppendTargetTitle,
  WikiGeneratorService,
} from './wiki-generator.service';

jest.mock('fs/promises');

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('WikiGeneratorService', () => {
  let service: WikiGeneratorService;

  const prisma = {
    rawItem: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    wikiPage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wikiPageSource: {
      create: jest.fn(),
    },
    project: {
      findFirst: jest.fn(),
    },
  };

  const ollamaClient = { generate: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('/vault') };
  const vaultWriter = {
    writeWikiFile: jest.fn(),
    appendWikiFile: jest.fn(),
    appendProjectSubtopicLink: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('/vault');
    mockedFs.readFile.mockResolvedValue(
      '---\nsourceType: "text"\n---\nCaptured body text',
    );
    vaultWriter.writeWikiFile.mockResolvedValue(undefined);
    vaultWriter.appendWikiFile.mockResolvedValue(undefined);
    vaultWriter.appendProjectSubtopicLink.mockResolvedValue(undefined);
    prisma.project.findFirst.mockResolvedValue(null);

    service = new WikiGeneratorService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      ollamaClient,
      vaultWriter as unknown as VaultWriterService,
    );
  });

  it('creates a new WikiPage when Ollama proposes a new title', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-1',
        rawFilePath: 'raw/text/note.md',
        sourceType: 'text',
        sourceUrl: null,
      },
    ]);
    prisma.wikiPage.findMany.mockResolvedValue([]);
    prisma.wikiPage.findUnique.mockResolvedValue(null);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({
        action: 'new',
        title: 'Networking Basics',
        summary: 'A summary.',
      }),
    );
    prisma.wikiPage.create.mockResolvedValue({ id: 'wiki-1' });

    const result = await service.processInbox();

    expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
    const createMock = prisma.wikiPage.create;
    const calls = createMock.mock.calls as Array<
      [{ data: { title: string; filePath: string; summary: string } }]
    >;
    const createCall = calls[0][0];
    expect(createCall.data).toEqual({
      title: 'Networking Basics',
      filePath: 'wiki/networking-basics.md',
      summary: 'A summary.',
      lastUpdatedAt: expect.any(Date) as Date,
    });
    expect(vaultWriter.writeWikiFile).toHaveBeenCalledWith(
      '/vault',
      'wiki/networking-basics.md',
      expect.stringContaining('A summary.'),
    );
    expect(prisma.wikiPageSource.create).toHaveBeenCalledWith({
      data: { rawItemId: 'raw-1', wikiPageId: 'wiki-1' },
    });
    expect(prisma.rawItem.update).toHaveBeenCalledWith({
      where: { id: 'raw-1' },
      data: { processed: true },
    });
  });

  it('creates the project main index under wiki/<project-slug>/ for GitHub raw items', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-gh-1',
        rawFilePath: 'raw/github/user-my-pensieve-20260101.md',
        sourceType: 'github',
        sourceUrl: 'https://github.com/user/my-pensieve',
      },
    ]);
    prisma.project.findFirst.mockResolvedValue({
      name: 'My Pensieve',
      repoUrl: 'https://github.com/user/my-pensieve',
    });
    prisma.wikiPage.findMany.mockResolvedValue([]);
    prisma.wikiPage.findUnique.mockResolvedValue(null);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({
        action: 'new',
        title: 'My Pensieve Overview',
        summary: 'Project overview summary.',
      }),
    );
    prisma.wikiPage.create.mockResolvedValue({ id: 'wiki-project-1' });

    const result = await service.processInbox();

    expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
    expect(prisma.wikiPage.create).toHaveBeenCalledWith({
      data: {
        title: 'My Pensieve',
        filePath: 'wiki/my-pensieve/My-Pensieve.md',
        summary: 'Project overview summary.',
        lastUpdatedAt: expect.any(Date) as Date,
      },
    });
    expect(vaultWriter.writeWikiFile).toHaveBeenCalledWith(
      '/vault',
      'wiki/my-pensieve/My-Pensieve.md',
      expect.stringContaining('Project overview summary.'),
    );
    expect(vaultWriter.appendProjectSubtopicLink).not.toHaveBeenCalled();
  });

  it('creates a project sub-topic and links it from the main index', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-gh-2',
        rawFilePath: 'raw/github/user-my-pensieve-20260102.md',
        sourceType: 'github',
        sourceUrl: 'https://github.com/user/my-pensieve',
      },
    ]);
    prisma.project.findFirst.mockResolvedValue({
      name: 'My Pensieve',
      repoUrl: 'https://github.com/user/my-pensieve',
    });
    prisma.wikiPage.findMany.mockResolvedValue([
      {
        id: 'wiki-index',
        title: 'My Pensieve',
        filePath: 'wiki/my-pensieve/My-Pensieve.md',
      },
    ]);
    prisma.wikiPage.findUnique.mockResolvedValue(null);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({
        action: 'new',
        title: 'Knowledge Inbox',
        summary: 'Inbox pipeline summary.',
      }),
    );
    prisma.wikiPage.create.mockResolvedValue({ id: 'wiki-sub-1' });

    const result = await service.processInbox();

    expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
    expect(prisma.wikiPage.create).toHaveBeenCalledWith({
      data: {
        title: 'Knowledge Inbox',
        filePath: 'wiki/my-pensieve/knowledge-inbox.md',
        summary: 'Inbox pipeline summary.',
        lastUpdatedAt: expect.any(Date) as Date,
      },
    });
    expect(vaultWriter.appendProjectSubtopicLink).toHaveBeenCalledWith(
      '/vault',
      'wiki/my-pensieve/My-Pensieve.md',
      '[[wiki/my-pensieve/knowledge-inbox|Knowledge Inbox]]',
    );
  });

  it('appends to an existing WikiPage when Ollama selects an existing title', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-2',
        rawFilePath: 'raw/text/note2.md',
        sourceType: 'text',
        sourceUrl: null,
      },
    ]);
    prisma.wikiPage.findMany.mockResolvedValue([
      {
        id: 'wiki-9',
        title: 'Networking Basics',
        filePath: 'wiki/networking-basics.md',
      },
    ]);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({ action: 'append', title: 'Networking Basics' }),
    );

    const result = await service.processInbox();

    expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
    expect(vaultWriter.appendWikiFile).toHaveBeenCalledWith(
      '/vault',
      'wiki/networking-basics.md',
      expect.stringContaining('Captured body text'),
    );
    expect(prisma.wikiPage.update).toHaveBeenCalledWith({
      where: { id: 'wiki-9' },
      data: { lastUpdatedAt: expect.any(Date) as Date },
    });
    expect(prisma.wikiPageSource.create).toHaveBeenCalledWith({
      data: { rawItemId: 'raw-2', wikiPageId: 'wiki-9' },
    });
  });

  it.each([
    ['My Pensieve Overview', 'My Pensieve'],
    ['My-Pensieve', 'My Pensieve'],
    ['My Pensieve Overview.md', 'My Pensieve'],
  ])(
    'loosely matches append title "%s" to canonical title "%s"',
    async (ollamaTitle, canonicalTitle) => {
      prisma.rawItem.findMany.mockResolvedValue([
        {
          id: 'raw-loose',
          rawFilePath: 'raw/github/user-my-pensieve-20260103.md',
          sourceType: 'github',
          sourceUrl: 'https://github.com/user/my-pensieve',
        },
      ]);
      prisma.project.findFirst.mockResolvedValue({
        name: 'My Pensieve',
        repoUrl: 'https://github.com/user/my-pensieve',
      });
      prisma.wikiPage.findMany.mockResolvedValue([
        {
          id: 'wiki-index',
          title: canonicalTitle,
          filePath: 'wiki/my-pensieve/My-Pensieve.md',
        },
      ]);
      ollamaClient.generate.mockResolvedValue(
        JSON.stringify({ action: 'append', title: ollamaTitle }),
      );

      const result = await service.processInbox();

      expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
      expect(vaultWriter.appendWikiFile).toHaveBeenCalledWith(
        '/vault',
        'wiki/my-pensieve/My-Pensieve.md',
        expect.stringContaining('Captured body text'),
      );
      expect(prisma.wikiPage.update).toHaveBeenCalledWith({
        where: { id: 'wiki-index' },
        data: { lastUpdatedAt: expect.any(Date) as Date },
      });
    },
  );

  describe('resolveAppendTargetTitle', () => {
    const projectIndexPage = {
      title: 'My Pensieve',
      filePath: 'wiki/my-pensieve/My-Pensieve.md',
    };

    it('normalizes titles by stripping extensions, punctuation, and casing', () => {
      expect(normalizeWikiTitleForMatch('My Pensieve Overview.md')).toBe(
        'my pensieve overview',
      );
      expect(normalizeWikiTitleForMatch('My-Pensieve')).toBe('my pensieve');
    });

    it('resolves variant append titles to the canonical wiki page title', () => {
      expect(
        resolveAppendTargetTitle('My Pensieve Overview', [projectIndexPage]),
      ).toBe('My Pensieve');
      expect(resolveAppendTargetTitle('My-Pensieve', [projectIndexPage])).toBe(
        'My Pensieve',
      );
      expect(
        resolveAppendTargetTitle('My Pensieve Overview.md', [projectIndexPage]),
      ).toBe('My Pensieve');
    });
  });

  it('records a failure and leaves the item unprocessed when Ollama is unreachable, without aborting the batch', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-3',
        rawFilePath: 'raw/text/fails.md',
        sourceType: 'text',
        sourceUrl: null,
      },
      {
        id: 'raw-4',
        rawFilePath: 'raw/text/succeeds.md',
        sourceType: 'text',
        sourceUrl: null,
      },
    ]);
    prisma.wikiPage.findMany.mockResolvedValue([]);
    prisma.wikiPage.findUnique.mockResolvedValue(null);
    prisma.wikiPage.create.mockResolvedValue({ id: 'wiki-5' });

    ollamaClient.generate
      .mockRejectedValueOnce(new Error('Ollama unreachable'))
      .mockResolvedValueOnce(
        JSON.stringify({
          action: 'new',
          title: 'Recovered Topic',
          summary: 'Summary text.',
        }),
      );

    const result = await service.processInbox();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failures).toEqual([
      { rawItemId: 'raw-3', reason: 'Ollama unreachable' },
    ]);
    expect(prisma.rawItem.update).toHaveBeenCalledTimes(1);
    expect(prisma.rawItem.update).toHaveBeenCalledWith({
      where: { id: 'raw-4' },
      data: { processed: true },
    });
  });

  it('records a failure when Ollama selects an append title that does not exist', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      {
        id: 'raw-5',
        rawFilePath: 'raw/text/note5.md',
        sourceType: 'text',
        sourceUrl: null,
      },
    ]);
    prisma.wikiPage.findMany.mockResolvedValue([
      { id: 'wiki-1', title: 'Real Page', filePath: 'wiki/real-page.md' },
    ]);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({ action: 'append', title: 'Nonexistent Page' }),
    );

    const result = await service.processInbox();

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.failures[0].rawItemId).toBe('raw-5');
    expect(prisma.rawItem.update).not.toHaveBeenCalled();
  });
});
