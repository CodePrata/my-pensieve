import { Context } from 'telegraf';
import { VideoEnrichmentConfig } from '../lib/videoEnrichmentConfig';
import { handleImage } from './imageHandler';
import { handleLink } from './linkHandler';
import { handleText } from './textHandler';

const URL_REGEX = /https?:\/\/[^\s]+/i;

export interface MessageRouterConfig {
  vaultPath: string;
  allowedUserId: number;
  ollamaBaseUrl: string;
  ollamaVisionModel: string;
  videoEnrichment: VideoEnrichmentConfig;
}

export function createMessageRouter(config: MessageRouterConfig) {
  return async function messageRouter(ctx: Context): Promise<void> {
    const fromId = ctx.from?.id;
    if (fromId !== config.allowedUserId) {
      return;
    }

    const message = ctx.message as
      | { photo?: unknown[]; text?: string; video?: unknown; document?: unknown; audio?: unknown; voice?: unknown; sticker?: unknown }
      | undefined;

    if (!message) {
      return;
    }

    if (message.photo && message.photo.length > 0) {
      await handleImage(ctx, config.vaultPath, config.ollamaBaseUrl, config.ollamaVisionModel);
      return;
    }

    if (typeof message.text === 'string') {
      const urlMatch = message.text.match(URL_REGEX);
      if (urlMatch) {
        await handleLink(ctx, urlMatch[0], config.vaultPath, config.videoEnrichment);
        return;
      }
      await handleText(ctx, config.vaultPath);
      return;
    }

    await ctx.reply(
      "This message type isn't supported yet — only text, links, and photos can be captured right now.",
    );
  };
}
