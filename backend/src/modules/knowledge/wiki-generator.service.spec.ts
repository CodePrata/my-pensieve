import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { OllamaClientService } from '../ollama/ollama-client.service';
import { WikiGeneratorService } from './wiki-generator.service';

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
  };

  const ollamaClient = { generate: jest.fn() };
  const configService = { get: jest.fn().mockReturnValue('/vault') };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.get.mockReturnValue('/vault');
    mockedFs.readFile.mockResolvedValue('---\nsourceType: "text"\n---\nCaptured body text');
    mockedFs.appendFile.mockResolvedValue(undefined);
    mockedFs.writeFile.mockResolvedValue(undefined);
    mockedFs.mkdir.mockResolvedValue(undefined as never);

    service = new WikiGeneratorService(
      prisma as unknown as PrismaService,
      configService as unknown as ConfigService,
      ollamaClient as unknown as OllamaClientService,
    );
  });

  it('creates a new WikiPage when Ollama proposes a new title', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      { id: 'raw-1', rawFilePath: 'raw/text/note.md' },
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
    expect(prisma.wikiPage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Networking Basics',
        filePath: 'wiki/networking-basics.md',
        summary: 'A summary.',
      }),
    });
    expect(mockedFs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('networking-basics.md'),
      expect.stringContaining('A summary.'),
      'utf-8',
    );
    expect(prisma.wikiPageSource.create).toHaveBeenCalledWith({
      data: { rawItemId: 'raw-1', wikiPageId: 'wiki-1' },
    });
    expect(prisma.rawItem.update).toHaveBeenCalledWith({
      where: { id: 'raw-1' },
      data: { processed: true },
    });
  });

  it('appends to an existing WikiPage when Ollama selects an existing title', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      { id: 'raw-2', rawFilePath: 'raw/text/note2.md' },
    ]);
    prisma.wikiPage.findMany.mockResolvedValue([
      { id: 'wiki-9', title: 'Networking Basics', filePath: 'wiki/networking-basics.md' },
    ]);
    ollamaClient.generate.mockResolvedValue(
      JSON.stringify({ action: 'append', title: 'Networking Basics' }),
    );

    const result = await service.processInbox();

    expect(result).toEqual({ processed: 1, failed: 0, failures: [] });
    expect(mockedFs.appendFile).toHaveBeenCalledWith(
      expect.stringContaining('networking-basics.md'),
      expect.stringContaining('Captured body text'),
      'utf-8',
    );
    expect(prisma.wikiPage.update).toHaveBeenCalledWith({
      where: { id: 'wiki-9' },
      data: { lastUpdatedAt: expect.any(Date) },
    });
    expect(prisma.wikiPageSource.create).toHaveBeenCalledWith({
      data: { rawItemId: 'raw-2', wikiPageId: 'wiki-9' },
    });
  });

  it('records a failure and leaves the item unprocessed when Ollama is unreachable, without aborting the batch', async () => {
    prisma.rawItem.findMany.mockResolvedValue([
      { id: 'raw-3', rawFilePath: 'raw/text/fails.md' },
      { id: 'raw-4', rawFilePath: 'raw/text/succeeds.md' },
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
      { id: 'raw-5', rawFilePath: 'raw/text/note5.md' },
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
