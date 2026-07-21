export class TelegramTransientError extends Error {
  constructor(message = 'Telegram request failed transiently') {
    super(message);
    this.name = 'TelegramTransientError';
  }
}

export class TelegramAuthFailedError extends Error {
  constructor(message = 'Telegram bot token is invalid or revoked') {
    super(message);
    this.name = 'TelegramAuthFailedError';
  }
}

export class TelegramChatNotFoundError extends Error {
  constructor(
    message = 'Telegram chat not found — the allowed user has never messaged the bot, or TELEGRAM_ALLOWED_USER_ID is wrong',
  ) {
    super(message);
    this.name = 'TelegramChatNotFoundError';
  }
}
