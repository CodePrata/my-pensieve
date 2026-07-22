import { Context } from 'telegraf';
import * as path from 'path';
import * as cheerio from 'cheerio';
import { enrichVideoNoteWithTranscript } from '../lib/enrichVideoNoteWithTranscript';
import { isVideoEnrichmentUrl } from '../lib/isVideoEnrichmentUrl';
import {
  fetchTikTokOembed,
  formatBookmarkNote,
  formatTikTokNote,
  isTikTokUrl,
} from '../lib/tiktokOembed';
import {
  writeRawFile,
  appendLog,
  filenameStemFromDate,
} from '../lib/vaultWriter';
import { guessSourceType } from '../lib/sourceTypeGuesser';
import { VideoEnrichmentConfig } from '../lib/videoEnrichmentConfig';
import { CaptureResult } from '../types';

interface LinkMetadata {
  title: string;
  description: string;
  image: string;
}

async function extractMetadata(url: string): Promise<LinkMetadata> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }
  const html = await response.text();
  const $ = cheerio.load(html);

  const title =
    $('meta[property="og:title"]').attr('content') ??
    $('title').first().text() ??
    '';
  const description =
    $('meta[property="og:description"]').attr('content') ?? '';
  const image = $('meta[property="og:image"]').attr('content') ?? '';

  return { title, description, image };
}

export async function handleLink(
  ctx: Context,
  url: string,
  vaultPath: string,
  videoEnrichment?: VideoEnrichmentConfig,
): Promise<void> {
  const sourceType = guessSourceType(url);
  const capturedAt = new Date().toISOString();
  const filenameStem = filenameStemFromDate(new Date(capturedAt));

  let body: string;
  let metadataExtractionFailed = false;

  if (isTikTokUrl(url)) {
    const oembed = await fetchTikTokOembed(url);
    if (oembed) {
      body = formatTikTokNote(url, oembed);
    } else {
      metadataExtractionFailed = true;
      body = formatBookmarkNote(url);
    }
  } else {
    try {
      const metadata = await extractMetadata(url);
      body = [
        `# ${metadata.title || url}`,
        '',
        metadata.description,
        '',
        metadata.image ? `![](${metadata.image})` : '',
        '',
        url,
      ]
        .filter((line) => line !== undefined)
        .join('\n');
    } catch (err) {
      metadataExtractionFailed = true;
      body = `Metadata extraction failed: ${(err as Error).message}\n\n${url}`;
    }
  }

  const rawFilePath = await writeRawFile(
    vaultPath,
    sourceType,
    filenameStem,
    {
      capturedAt,
      sourceType,
      captureMethod: 'capture_bot',
      sourceUrl: url,
      processed: false,
      ...(metadataExtractionFailed ? { metadataExtractionFailed: true } : {}),
    },
    body,
  );

  const result: CaptureResult = {
    sourceType,
    rawFilePath,
    sourceUrl: url,
    capturedAt,
  };
  await appendLog(vaultPath, result);

  if (videoEnrichment && isVideoEnrichmentUrl(url)) {
    const absoluteNotePath = path.join(vaultPath, rawFilePath);
    void enrichVideoNoteWithTranscript(
      absoluteNotePath,
      url,
      videoEnrichment,
    ).catch((err) => {
      console.error('[video-enrichment] Unhandled rejection:', err);
    });
  }

  await ctx.reply(
    metadataExtractionFailed
      ? 'Saved the link, but metadata could not be fetched.'
      : 'Saved.',
  );
}
