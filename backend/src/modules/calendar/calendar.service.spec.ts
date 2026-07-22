import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarAuthExpiredError } from './calendar-auth-expired.error';
import { CalendarService } from './calendar.service';

describe('CalendarService', () => {
  let service: CalendarService;

  const prisma = {
    calendarOAuthToken: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'GOOGLE_CLIENT_ID') return 'client-id';
      if (key === 'GOOGLE_CLIENT_SECRET') return 'client-secret';
      return undefined;
    }),
  };

  const storedToken = {
    id: 'token-1',
    provider: 'google',
    accessToken: 'old-access',
    refreshToken: 'refresh-token',
    scope: 'calendar',
    tokenType: 'Bearer',
    expiryDate: new Date('2020-01-01'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    global.fetch = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(CalendarService);
    prisma.calendarOAuthToken.findUnique.mockResolvedValue(storedToken);
  });

  describe('refreshAccessToken', () => {
    function mockFailedRefresh(status: number, body: string) {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status,
        text: () => Promise.resolve(body),
      });
    }

    it('throws CalendarAuthExpiredError when Google returns invalid_grant', async () => {
      mockFailedRefresh(400, JSON.stringify({ error: 'invalid_grant' }));

      await expect(service.refreshAccessToken()).rejects.toBeInstanceOf(
        CalendarAuthExpiredError,
      );
    });

    it('throws generic Error for other JSON error codes', async () => {
      mockFailedRefresh(500, JSON.stringify({ error: 'server_error' }));

      const promise = service.refreshAccessToken();

      await expect(promise).rejects.toThrow(
        'Failed to refresh Google access token: 500 {"error":"server_error"}',
      );
      await expect(promise).rejects.not.toBeInstanceOf(
        CalendarAuthExpiredError,
      );
    });

    it('throws generic Error when response body is not valid JSON', async () => {
      const html = '<html><body>502 Bad Gateway</body></html>';
      mockFailedRefresh(502, html);

      const promise = service.refreshAccessToken();

      await expect(promise).rejects.toThrow(
        `Failed to refresh Google access token: 502 ${html}`,
      );
      await expect(promise).rejects.not.toBeInstanceOf(
        CalendarAuthExpiredError,
      );
    });

    it('throws generic Error when JSON body has no error field', async () => {
      mockFailedRefresh(
        400,
        JSON.stringify({ message: 'something went wrong' }),
      );

      const promise = service.refreshAccessToken();

      await expect(promise).rejects.toThrow(
        /Failed to refresh Google access token: 400/,
      );
      await expect(promise).rejects.not.toBeInstanceOf(
        CalendarAuthExpiredError,
      );
    });

    it('throws generic Error when response body is empty', async () => {
      mockFailedRefresh(500, '');

      const promise = service.refreshAccessToken();

      await expect(promise).rejects.toThrow(
        'Failed to refresh Google access token: 500 ',
      );
      await expect(promise).rejects.not.toBeInstanceOf(
        CalendarAuthExpiredError,
      );
    });
  });
});
