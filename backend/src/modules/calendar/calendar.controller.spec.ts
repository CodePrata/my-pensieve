import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CalendarAuthExpiredError } from './calendar-auth-expired.error';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

describe('CalendarController', () => {
  let controller: CalendarController;
  let calendarService: jest.Mocked<Pick<CalendarService, 'syncEvents'>>;
  let configService: jest.Mocked<Pick<ConfigService, 'get'>>;

  beforeEach(() => {
    calendarService = {
      syncEvents: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => (key === 'PORT' ? '3000' : undefined)),
    };

    controller = new CalendarController(
      calendarService as unknown as CalendarService,
      configService as unknown as ConfigService,
    );
  });

  describe('POST /calendar/sync', () => {
    it('maps CalendarAuthExpiredError to 401 with reauthUrl', async () => {
      calendarService.syncEvents.mockRejectedValue(
        new CalendarAuthExpiredError(),
      );

      await expect(controller.syncEvents()).rejects.toMatchObject({
        status: HttpStatus.UNAUTHORIZED,
        response: {
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Google Calendar sync failed',
          errorType: 'auth_expired',
          error: 'Google Calendar authorization expired or revoked',
          reauthUrl: 'http://localhost:3000/calendar/auth',
        },
      });
    });

    it('maps generic Error to 502 transient without reauthUrl', async () => {
      calendarService.syncEvents.mockRejectedValue(
        new Error('Failed to refresh Google access token: 502 <html>'),
      );

      const error = (await controller
        .syncEvents()
        .catch((caught) => caught)) as HttpException;

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Google Calendar sync failed',
        errorType: 'transient',
        error: 'Failed to refresh Google access token: 502 <html>',
      });
      expect(
        (error.getResponse() as Record<string, unknown>).reauthUrl,
      ).toBeUndefined();
    });

    it('maps server_error refresh failure to 502 transient without reauthUrl', async () => {
      calendarService.syncEvents.mockRejectedValue(
        new Error(
          'Failed to refresh Google access token: 500 {"error":"server_error"}',
        ),
      );

      const error = (await controller
        .syncEvents()
        .catch((caught) => caught)) as HttpException;

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Google Calendar sync failed',
        errorType: 'transient',
        error:
          'Failed to refresh Google access token: 500 {"error":"server_error"}',
      });
      expect(
        (error.getResponse() as Record<string, unknown>).reauthUrl,
      ).toBeUndefined();
    });
  });
});
