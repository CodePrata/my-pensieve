import { Injectable } from '@nestjs/common';

export interface RawItem {
  id: string;
  sourceType:
    | 'tiktok'
    | 'instagram'
    | 'screenshot'
    | 'text'
    | 'github'
    | 'youtube'
    | 'pdf'
    | 'obsidian_note'
    | 'other';
  captureMethod: 'capture_bot' | 'batch_import' | 'manual';
  sourceUrl: string | null;
  rawFilePath: string;
  capturedAt: string;
  processed: boolean;
}

@Injectable()
export class KnowledgeService {
  getInbox(): RawItem[] {
    return [
      {
        id: 'raw-001',
        sourceType: 'youtube',
        captureMethod: 'capture_bot',
        sourceUrl: 'https://youtube.com/watch?v=example',
        rawFilePath: 'raw/2026-07-01-youtube-network-security.md',
        capturedAt: '2026-07-01T18:45:00.000Z',
        processed: false,
      },
      {
        id: 'raw-002',
        sourceType: 'screenshot',
        captureMethod: 'capture_bot',
        sourceUrl: null,
        rawFilePath: 'raw/2026-07-02-screenshot-prisma-schema.png',
        capturedAt: '2026-07-02T07:10:00.000Z',
        processed: false,
      },
    ];
  }
}
