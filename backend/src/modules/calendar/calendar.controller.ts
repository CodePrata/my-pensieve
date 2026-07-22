import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { CalendarAuthExpiredError } from './calendar-auth-expired.error';
import { CalendarService } from './calendar.service';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleOAuthTokenResult } from './google-oauth.strategy';

// NOTE: the task spec asked for the callback at `GET /calendar/auth/callback`,
// but the redirect URI already configured in `.env`/Google Cloud Console is
// `http://localhost:3000/auth/google/callback`. Since that value must match
// exactly what Google redirects back to, the callback route below is wired to
// the real `GOOGLE_REDIRECT_URI` path instead of the `/calendar` prefix — see
// the task summary for details.
@Controller()
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar/events')
  getEvents() {
    return this.calendarService.getEvents();
  }

  @Post('calendar/sync')
  async syncEvents() {
    try {
      return await this.calendarService.syncEvents();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(
        `Google Calendar sync failed: ${detail}`,
        error instanceof Error ? error.stack : undefined,
      );
      if (error instanceof CalendarAuthExpiredError) {
        // Relative path so the frontend proxy handles it (avoids localhost/IPv6 issues).
        const reauthUrl = '/calendar/auth';
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Google Calendar sync failed',
            errorType: 'auth_expired',
            error: detail,
            reauthUrl,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Google Calendar sync failed',
          errorType: 'transient',
          error: detail,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('calendar/auth')
  @UseGuards(GoogleAuthGuard)
  initiateGoogleAuth() {
    // GoogleAuthGuard triggers the redirect to Google's consent screen;
    // this body never runs.
  }

  // NOTE: This route is registered at /auth/google/callback rather than
  // /calendar/auth/callback (which the module's URL prefix would suggest).
  // This is intentional: the path must exactly match GOOGLE_REDIRECT_URI as
  // registered in Google Cloud Console (http://localhost:3000/auth/google/callback),
  // or Google's redirect will 404. See handoff notes, OAuth implementation task.
  @Get('auth/google/callback') // or however the route decorator is currently written
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const result = req.user as GoogleOAuthTokenResult;
    await this.calendarService.storeTokens(result);
    this.logger.log('Google Calendar authorization complete; tokens stored.');
    res.status(200).send('Google Calendar connected. You can close this tab.');
  }
}
