import { Controller, Get, Logger, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
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

  @Get('calendar/auth')
  @UseGuards(GoogleAuthGuard)
  initiateGoogleAuth() {
    // GoogleAuthGuard triggers the redirect to Google's consent screen;
    // this body never runs.
  }

  @Get('auth/google/callback')
  @UseGuards(AuthGuard('google'))
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const result = req.user as GoogleOAuthTokenResult;
    await this.calendarService.storeTokens(result);
    this.logger.log('Google Calendar authorization complete; tokens stored.');
    res.status(200).send('Google Calendar connected. You can close this tab.');
  }
}
