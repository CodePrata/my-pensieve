import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { KnowledgeService } from './knowledge.service';
import { VaultScannerService } from './vault-scanner.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;

  const prisma = {
    rawItem: {
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
    },
  };

  const vaultScanner = {
    scanRawFolder: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: PrismaService, useValue: prisma },
        { provide: VaultScannerService, useValue: vaultScanner },
      ],
    }).compile();

    service = module.get(KnowledgeService);
  });

  describe('syncRawItems', () => {
    it('creates only files not already present, and skips existing ones', async () => {
      vaultScanner.scanRawFolder.mockResolvedValue([
        {
          sourceType: 'text',
          captureMethod: 'capture_bot',
          sourceUrl: null,
          rawFilePath: 'raw/text/new-item.md',
          capturedAt: new Date('2026-07-20T10:00:00.000Z'),
        },
        {
          sourceType: 'screenshot',
          captureMethod: 'capture_bot',
          sourceUrl: null,
          rawFilePath: 'raw/screenshot/existing-item.md',
          capturedAt: new Date('2026-07-19T10:00:00.000Z'),
        },
      ]);
      prisma.rawItem.findMany.mockResolvedValue([
        { rawFilePath: 'raw/screenshot/existing-item.md' },
      ]);

      const result = await service.syncRawItems();

      expect(result).toEqual({ created: 1, skipped: 1 });
      expect(prisma.rawItem.create).toHaveBeenCalledTimes(1);
      const createMock = prisma.rawItem.create;
      const calls = createMock.mock.calls as Array<
        [{ data: { rawFilePath: string } }]
      >;
      const createCall = calls[0][0];
      expect(createCall.data.rawFilePath).toBe('raw/text/new-item.md');
    });

    it('does not touch already-processed rows — sync never updates existing rows', async () => {
      vaultScanner.scanRawFolder.mockResolvedValue([
        {
          sourceType: 'text',
          captureMethod: 'capture_bot',
          sourceUrl: null,
          rawFilePath: 'raw/text/already-processed.md',
          capturedAt: new Date('2026-07-18T10:00:00.000Z'),
        },
      ]);
      prisma.rawItem.findMany.mockResolvedValue([
        { rawFilePath: 'raw/text/already-processed.md' },
      ]);

      const result = await service.syncRawItems();

      expect(result).toEqual({ created: 0, skipped: 1 });
      expect(prisma.rawItem.create).not.toHaveBeenCalled();
    });

    it('short-circuits with zero counts when the vault has no raw files', async () => {
      vaultScanner.scanRawFolder.mockResolvedValue([]);

      const result = await service.syncRawItems();

      expect(result).toEqual({ created: 0, skipped: 0 });
      expect(prisma.rawItem.findMany).not.toHaveBeenCalled();
    });
  });

  describe('getInbox', () => {
    it('maps Prisma rows to the paginated API shape with ISO date strings', async () => {
      prisma.rawItem.findMany.mockResolvedValue([
        {
          id: 'raw-1',
          sourceType: 'text',
          captureMethod: 'capture_bot',
          sourceUrl: null,
          rawFilePath: 'raw/text/note.md',
          capturedAt: new Date('2026-07-20T10:00:00.000Z'),
          processed: false,
        },
      ]);
      prisma.rawItem.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(3);

      const result = await service.getInbox(4, 0);

      expect(prisma.rawItem.findMany).toHaveBeenCalledWith({
        orderBy: { capturedAt: 'desc' },
        take: 4,
        skip: 0,
      });
      expect(prisma.rawItem.count).toHaveBeenCalledWith({
        where: { processed: false },
      });
      expect(result).toEqual({
        items: [
          {
            id: 'raw-1',
            sourceType: 'text',
            captureMethod: 'capture_bot',
            sourceUrl: null,
            rawFilePath: 'raw/text/note.md',
            capturedAt: '2026-07-20T10:00:00.000Z',
            processed: false,
          },
        ],
        totalCount: 5,
        unprocessedCount: 3,
        hasMore: true,
      });
    });

    it('returns hasMore false when the final page is reached', async () => {
      prisma.rawItem.findMany.mockResolvedValue([]);
      prisma.rawItem.count
        .mockResolvedValueOnce(4)
        .mockResolvedValueOnce(0);

      const result = await service.getInbox(4, 4);

      expect(result).toEqual({
        items: [],
        totalCount: 4,
        unprocessedCount: 0,
        hasMore: false,
      });
    });
  });
});
