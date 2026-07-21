import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FullBriefingPayload } from './briefing.service';
import {
  TelegramAuthFailedError,
  TelegramChatNotFoundError,
  TelegramTransientError,
} from './telegram-push.errors';

const TELEGRAM_API_BASE = 'https://api.telegram.org';
const TELEGRAM_TIMEOUT_MS = 15_000;

interface TelegramApiErrorResponse {
  ok: false;
  error_code: number;
  description: string;
}

@Injectable()
export class TelegramPushService {
  private readonly logger = new Logger(TelegramPushService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendBriefingToTelegram(briefing: FullBriefingPayload): Promise<void> {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    const chatId = this.configService.get<string>('TELEGRAM_ALLOWED_USER_ID');
    if (!token || !chatId) {
      throw new TelegramTransientError(
        'TELEGRAM_BOT_TOKEN or TELEGRAM_ALLOWED_USER_ID is not configured',
      );
    }

    const text = this.formatMessage(briefing);

    try {
      await this.send(token, chatId, text, 'Markdown');
    } catch (error) {
      if (error instanceof TelegramMarkdownParseError) {
        this.logger.warn(
          'Telegram rejected Markdown formatting; retrying as plain text',
        );
        await this.send(token, chatId, text, undefined);
        return;
      }
      throw error;
    }
  }

  private formatMessage(briefing: FullBriefingPayload): string {
    const lines: string[] = [briefing.narration];

    if (briefing.data.priorities.length > 0) {
      lines.push('');
      lines.push('Top priorities:');
      for (const priority of briefing.data.priorities) {
        lines.push(`${priority.rank}. ${priority.title} (${priority.type})`);
      }
    }

    if (briefing.degraded) {
      lines.push('');
      lines.push(
        `⚠️ Showing a simplified summary${briefing.degradedReason ? `: ${briefing.degradedReason}` : ''}`,
      );
    }

    return lines.join('\n');
  }

  private async send(
    token: string,
    chatId: string,
    text: string,
    parseMode: 'Markdown' | undefined,
  ): Promise<void> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      TELEGRAM_TIMEOUT_MS,
    );

    let response: Response;
    try {
      response = await fetch(
        `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            ...(parseMode ? { parse_mode: parseMode } : {}),
          }),
          signal: controller.signal,
        },
      );
    } catch (error) {
      throw new TelegramTransientError(
        `Telegram request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (response.ok) {
      return;
    }

    let body: TelegramApiErrorResponse | undefined;
    try {
      body = (await response.json()) as TelegramApiErrorResponse;
    } catch {
      // Non-JSON error body — fall through to status-based handling.
    }
    const description = body?.description ?? `HTTP ${response.status}`;

    if (response.status === 401 || response.status === 403) {
      throw new TelegramAuthFailedError(
        `Telegram authorization failed: ${description}`,
      );
    }

    if (
      response.status === 400 &&
      /chat not found/i.test(description)
    ) {
      throw new TelegramChatNotFoundError(
        `Telegram chat not found: ${description}`,
      );
    }

    if (
      response.status === 400 &&
      parseMode === 'Markdown' &&
      /can't parse entities|can't find end of/i.test(description)
    ) {
      throw new TelegramMarkdownParseError(description);
    }

    if (response.status >= 500) {
      throw new TelegramTransientError(
        `Telegram request failed: ${description}`,
      );
    }

    throw new TelegramTransientError(`Telegram request failed: ${description}`);
  }
}

class TelegramMarkdownParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TelegramMarkdownParseError';
  }
}
