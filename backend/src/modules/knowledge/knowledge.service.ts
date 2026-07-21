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
}

@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultScanner: VaultScannerService,
  ) {}

  async syncRawItems(): Promise<SyncRawItemsResult> {
    const parsedFiles = await this.vaultScanner.scanRawFolder();

    if (parsedFiles.length === 0) {
      return { created: 0, skipped: 0 };
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

    return { created, skipped };
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

  async getInbox(): Promise<RawItem[]> {
    const items = await this.prisma.rawItem.findMany({
      orderBy: { capturedAt: 'desc' },
    });

    return items.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      captureMethod: item.captureMethod,
      sourceUrl: item.sourceUrl,
      rawFilePath: item.rawFilePath,
      capturedAt: item.capturedAt.toISOString(),
      processed: item.processed,
    }));
  }
}
