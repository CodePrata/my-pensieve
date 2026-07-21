import { Context } from 'telegraf';
import { writeRawFile, appendLog, filenameStemFromDate } from '../lib/vaultWriter';
import { CaptureResult } from '../types';

export async function handleText(ctx: Context, vaultPath: string): Promise<void> {
  const message = ctx.message as { text?: string } | undefined;
  const body = message?.text ?? '';
  const capturedAt = new Date().toISOString();
  const filenameStem = filenameStemFromDate(new Date(capturedAt));

  const rawFilePath = await writeRawFile(
    vaultPath,
    'text',
    filenameStem,
    {
      capturedAt,
      sourceType: 'text',
      captureMethod: 'capture_bot',
      processed: false,
    },
    body,
  );

  const result: CaptureResult = { sourceType: 'text', rawFilePath, capturedAt };
  await appendLog(vaultPath, result);

  await ctx.reply('Saved.');
}
