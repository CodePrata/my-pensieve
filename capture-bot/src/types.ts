export type SourceType =
  | 'tiktok'
  | 'instagram'
  | 'screenshot'
  | 'text'
  | 'github'
  | 'youtube'
  | 'pdf'
  | 'obsidian_note'
  | 'other';

export type CaptureMethod = 'capture_bot';

export interface CaptureResult {
  sourceType: SourceType;
  rawFilePath: string;
  sourceUrl?: string;
  capturedAt: string;
}
