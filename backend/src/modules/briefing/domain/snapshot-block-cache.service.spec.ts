import { BriefingSnapshot } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service';
import { SnapshotBlockCacheService } from './snapshot-block-cache.service';

describe('SnapshotBlockCacheService', () => {
  let service: SnapshotBlockCacheService;
  let prisma: jest.Mocked<Pick<PrismaService, 'briefingSnapshot'>>;
  let findFirst: jest.Mock;

  beforeEach(() => {
    findFirst = jest.fn();
    prisma = {
      briefingSnapshot: {
        findFirst,
      } as unknown as PrismaService['briefingSnapshot'],
    };

    service = new SnapshotBlockCacheService(prisma as unknown as PrismaService);
  });

  it('returns null when no snapshot exists for today', async () => {
    findFirst.mockResolvedValue(null);

    const result = await service.findSnapshotForCurrentBlock(
      atLocal(2026, 7, 8, 14, 0),
    );

    expect(result).toBeNull();
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        date: startOfDay(atLocal(2026, 7, 8, 14, 0)),
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });
  });

  it('returns the snapshot when it was generated in the same time block', async () => {
    const now = atLocal(2026, 7, 8, 14, 30);
    const snapshot = makeSnapshot({
      generatedAt: atLocal(2026, 7, 8, 13, 15),
    });

    findFirst.mockResolvedValue(snapshot);

    const result = await service.findSnapshotForCurrentBlock(now);

    expect(result).toBe(snapshot);
  });

  it('returns null when the latest snapshot is from an earlier block today', async () => {
    const now = atLocal(2026, 7, 8, 14, 30);
    const snapshot = makeSnapshot({
      generatedAt: atLocal(2026, 7, 8, 9, 0),
    });

    findFirst.mockResolvedValue(snapshot);

    const result = await service.findSnapshotForCurrentBlock(now);

    expect(result).toBeNull();
  });
});

function makeSnapshot(overrides: Partial<BriefingSnapshot>): BriefingSnapshot {
  return {
    id: 'snapshot-1',
    date: startOfDay(atLocal(2026, 7, 8, 0, 0)),
    generatedAt: atLocal(2026, 7, 8, 9, 0),
    degraded: false,
    degradedReason: null,
    narration: 'Cached narration',
    createdAt: atLocal(2026, 7, 8, 9, 0),
    updatedAt: atLocal(2026, 7, 8, 9, 0),
    ...overrides,
  };
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function atLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
