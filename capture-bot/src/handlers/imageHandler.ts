import { Context } from 'telegraf';
import * as fs from 'fs/promises';
import * as path from 'path';
import { writeRawFile, appendLog, filenameStemFromDate } from '../lib/vaultWriter';
import { captionImage } from '../lib/ollamaClient';
import { CaptureResult } from '../types';

export async function handleImage(
  ctx: Context,
  vaultPath: string,
  ollamaBaseUrl: string,
  visionModel: string,
): Promise<void> {
  const message = ctx.message as { photo?: Array<{ file_id: string }> } | undefined;
  const photoSizes = message?.photo ?? [];
  const largestPhoto = photoSizes[photoSizes.length - 1];

  const fileLink = await ctx.telegram.getFileLink(largestPhoto.file_id);
  const fileResponse = await fetch(fileLink.toString());
  const imageBuffer = Buffer.from(await fileResponse.arrayBuffer());

  const capturedAt = new Date().toISOString();
  const filenameStem = filenameStemFromDate(new Date(capturedAt));

  const imageRelativePath = path.join('raw', 'screenshot', `${filenameStem}.jpg`).split(path.sep).join('/');
  const imageAbsoluteDir = path.join(vaultPath, 'raw', 'screenshot');
  await fs.mkdir(imageAbsoluteDir, { recursive: true });
  await fs.writeFile(path.join(vaultPath, imageRelativePath), imageBuffer);

  let caption: string;
  let captioningFailed = false;
  try {
    caption = await captionImage(imageBuffer, visionModel, ollamaBaseUrl);
  } catch {
    captioningFailed = true;
    caption = 'Captioning failed.';
  }

  const rawFilePath = await writeRawFile(
    vaultPath,
    'screenshot',
    filenameStem,
    {
      capturedAt,
      sourceType: 'screenshot',
      captureMethod: 'capture_bot',
      processed: false,
      imagePath: imageRelativePath,
      ...(captioningFailed ? { captioningFailed: true } : {}),
    },
    caption,
  );

  const result: CaptureResult = { sourceType: 'screenshot', rawFilePath, capturedAt };
  await appendLog(vaultPath, result);

  await ctx.reply(
    captioningFailed ? 'Saved the image, but captioning failed.' : 'Saved.',
  );
}
