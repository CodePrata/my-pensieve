import { ConfigService } from '@nestjs/config';
import { FullBriefingPayload } from './briefing.service';
import {
  TelegramAuthFailedError,
  TelegramChatNotFoundError,
  TelegramTransientError,
} from './telegram-push.errors';
import { TelegramPushService } from './telegram-push.service';

describe('TelegramPushService', () => {
  let service: TelegramPushService;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;
  let fetchMock: jest.Mock;

  const briefing: FullBriefingPayload = {
    data: {
      priorities: [
        {
          id: 'proj-1',
          type: 'project',
          title: 'My Pensieve',
          dueDate: null,
          importance: 'high',
          status: 'active',
          estimatedDurationMinutes: 60,
          rank: 1,
        },
      ],
      freeTime: {
        windows: [],
        totalFreeMinutes: 120,
        largestWindowMinutes: 120,
        windowCount: 1,
      },
    },
    narration: 'Good morning, focus on My Pensieve today.',
    degraded: false,
    degradedReason: null,
  };

  beforeEach(() => {
    configService = { get: jest.fn() };
    configService.get.mockImplementation((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
      if (key === 'TELEGRAM_ALLOWED_USER_ID') return '12345';
      return undefined;
    });
    service = new TelegramPushService(
      configService as unknown as ConfigService,
    );
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  function jsonResponse(ok: boolean, status: number, body: unknown) {
    return {
      ok,
      status,
      json: () => Promise.resolve(body),
    } as Response;
  }

  type TelegramSendBody = {
    chat_id: string;
    parse_mode?: string;
    text: string;
  };

  it('sends a Markdown message and resolves on success', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(true, 200, { ok: true }));

    await service.sendBriefingToTelegram(briefing);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.telegram.org/bottest-token/sendMessage');
    const body = JSON.parse(options.body as string) as TelegramSendBody;
    expect(body.chat_id).toBe('12345');
    expect(body.parse_mode).toBe('Markdown');
    expect(body.text).toContain('My Pensieve');
  });

  it('retries as plain text when Telegram rejects Markdown parsing', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse(false, 400, {
          ok: false,
          error_code: 400,
          description: "Bad Request: can't parse entities",
        }),
      )
      .mockResolvedValueOnce(jsonResponse(true, 200, { ok: true }));

    await service.sendBriefingToTelegram(briefing);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCall = fetchMock.mock.calls[1] as [string, RequestInit];
    const secondBody = JSON.parse(
      secondCall[1].body as string,
    ) as TelegramSendBody;
    expect(secondBody.parse_mode).toBeUndefined();
  });

  it('throws TelegramAuthFailedError on 401', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(false, 401, {
        ok: false,
        error_code: 401,
        description: 'Unauthorized',
      }),
    );

    await expect(service.sendBriefingToTelegram(briefing)).rejects.toThrow(
      TelegramAuthFailedError,
    );
  });

  it('throws TelegramChatNotFoundError on 400 chat not found', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(false, 400, {
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      }),
    );

    await expect(service.sendBriefingToTelegram(briefing)).rejects.toThrow(
      TelegramChatNotFoundError,
    );
  });

  it('throws TelegramTransientError on 5xx', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(false, 502, {
        ok: false,
        error_code: 502,
        description: 'Bad Gateway',
      }),
    );

    await expect(service.sendBriefingToTelegram(briefing)).rejects.toThrow(
      TelegramTransientError,
    );
  });

  it('includes the degraded warning line when briefing is degraded', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(true, 200, { ok: true }));

    await service.sendBriefingToTelegram({
      ...briefing,
      degraded: true,
      degradedReason: 'Calendar sync failed',
    });

    const firstCall = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(firstCall[1].body as string) as TelegramSendBody;
    expect(body.text).toContain('Calendar sync failed');
  });
});
