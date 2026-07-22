import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { createMessageRouter } from './handlers/messageRouter';
import { loadVideoEnrichmentConfig } from './lib/videoEnrichmentConfig';

const REQUIRED_ENV_VARS = [
  'TELEGRAM_CAPTURE_BOT_TOKEN',
  'TELEGRAM_ALLOWED_USER_ID',
  'OBSIDIAN_VAULT_PATH',
  'OLLAMA_BASE_URL',
  'OLLAMA_VISION_MODEL',
] as const;

function loadConfig() {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  return {
    telegramToken: process.env.TELEGRAM_CAPTURE_BOT_TOKEN!,
    allowedUserId: Number(process.env.TELEGRAM_ALLOWED_USER_ID),
    vaultPath: process.env.OBSIDIAN_VAULT_PATH!,
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL!,
    ollamaVisionModel: process.env.OLLAMA_VISION_MODEL!,
    videoEnrichment: loadVideoEnrichmentConfig(),
  };
}

function main(): void {
  const config = loadConfig();
  const bot = new Telegraf(config.telegramToken);

  bot.on('message', createMessageRouter(config));

  void bot.launch();
  console.log('Capture bot launched.');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main();
