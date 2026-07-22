import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ParsedRawFile, VaultScannerService } from './vault-scanner.service';

export interface RawItem {
  id: string;
  sourceType: string;
  captureMethod: string;
  sourceUrl: string | null;
  rawFilePath: string;
  capturedAt: string;
  processed: boolean;
}

export interface SyncRawItemsResult {
  created: number;
  skipped: number;
  syncedAt: string;
}

export interface InboxResult {
  items: RawItem[];
  totalCount: number;
  unprocessedCount: number;
  hasMore: boolean;
  lastVaultSyncedAt: string | null;
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private lastVaultSyncedAt: Date | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultScanner: VaultScannerService,
  ) {}

  async syncRawItems(): Promise<SyncRawItemsResult> {
    const syncedAt = new Date();
    this.lastVaultSyncedAt = syncedAt;

    const parsedFiles = await this.vaultScanner.scanRawFolder();

    if (parsedFiles.length === 0) {
      return { created: 0, skipped: 0, syncedAt: syncedAt.toISOString() };
    }

    const existing = await this.prisma.rawItem.findMany({
      where: {
        rawFilePath: { in: parsedFiles.map((file) => file.rawFilePath) },
      },
      select: { rawFilePath: true },
    });
    const existingPaths = new Set(existing.map((row) => row.rawFilePath));

    let created = 0;
    let skipped = 0;

    for (const file of parsedFiles) {
      if (existingPaths.has(file.rawFilePath)) {
        skipped++;
        continue;
      }

      await this.createRawItem(file);
      created++;
    }

    this.logger.log(
      `Knowledge Inbox sync complete: ${created} created, ${skipped} skipped`,
    );

    return { created, skipped, syncedAt: syncedAt.toISOString() };
  }

  private async createRawItem(file: ParsedRawFile) {
    await this.prisma.rawItem.create({
      data: {
        sourceType: file.sourceType,
        captureMethod: file.captureMethod,
        sourceUrl: file.sourceUrl,
        rawFilePath: file.rawFilePath,
        capturedAt: file.capturedAt,
      },
    });
  }

  async getInbox(limit = 4, offset = 0): Promise<InboxResult> {
    const [rows, totalCount, unprocessedCount] = await Promise.all([
      this.prisma.rawItem.findMany({
        orderBy: { capturedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.rawItem.count(),
      this.prisma.rawItem.count({ where: { processed: false } }),
    ]);

    const items = rows.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      captureMethod: item.captureMethod,
      sourceUrl: item.sourceUrl,
      rawFilePath: item.rawFilePath,
      capturedAt: item.capturedAt.toISOString(),
      processed: item.processed,
    }));

    return {
      items,
      totalCount,
      unprocessedCount,
      hasMore: offset + items.length < totalCount,
      lastVaultSyncedAt: this.lastVaultSyncedAt?.toISOString() ?? null,
    };
  }
}
