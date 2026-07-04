import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleOAuthTokenResult } from './google-oauth.strategy';

export interface CalendarEvent {
  externalId: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isRecurring: boolean;
  source: string;
  lastSyncedAt: string;
}

const GOOGLE_PROVIDER = 'google';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

interface GoogleRefreshResponse {
  access_token: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Persists the tokens obtained from the OAuth callback. Google only
   * returns a refresh token on the first consent (or when `prompt=consent`
   * is forced), so an existing refresh token is preserved if a later grant
   * doesn't include a new one.
   */
  async storeTokens(result: GoogleOAuthTokenResult) {
    const expiryDate = result.expiresIn
      ? new Date(Date.now() + result.expiresIn * 1000)
      : null;

    const existing = await this.prisma.calendarOAuthToken.findUnique({
      where: { provider: GOOGLE_PROVIDER },
    });

    const refreshToken = result.refreshToken ?? existing?.refreshToken;
    if (!refreshToken) {
      throw new Error(
        'No refresh token returned by Google and none stored previously. ' +
          'Revoke app access at https://myaccount.google.com/permissions and retry ' +
          'so Google issues a fresh refresh token.',
      );
    }

    const saved = await this.prisma.calendarOAuthToken.upsert({
      where: { provider: GOOGLE_PROVIDER },
      update: {
        accessToken: result.accessToken,
        refreshToken,
        scope: result.scope,
        tokenType: result.tokenType,
        expiryDate,
      },
      create: {
        provider: GOOGLE_PROVIDER,
        accessToken: result.accessToken,
        refreshToken,
        scope: result.scope,
        tokenType: result.tokenType,
        expiryDate,
      },
    });

    this.logger.log(
      `Stored Google Calendar OAuth tokens (id=${saved.id}, expiresAt=${saved.expiryDate?.toISOString() ?? 'unknown'})`,
    );

    return saved;
  }

  /**
   * Exchanges the stored refresh token for a new access token. Kept in the
   * service (not the controller) so future sync logic can call it without
   * duplicating the HTTP exchange with Google.
   */
  async refreshAccessToken(): Promise<string> {
    const stored = await this.prisma.calendarOAuthToken.findUnique({
      where: { provider: GOOGLE_PROVIDER },
    });
    if (!stored) {
      throw new Error(
        'No Google Calendar tokens stored yet. Visit /calendar/auth first.',
      );
    }

    const response = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
        client_secret:
          this.configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
        refresh_token: stored.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Failed to refresh Google access token: ${response.status} ${body}`,
      );
    }

    const data = (await response.json()) as GoogleRefreshResponse;
    const expiryDate = new Date(Date.now() + data.expires_in * 1000);

    await this.prisma.calendarOAuthToken.update({
      where: { provider: GOOGLE_PROVIDER },
      data: {
        accessToken: data.access_token,
        scope: data.scope ?? stored.scope,
        tokenType: data.token_type ?? stored.tokenType,
        expiryDate,
      },
    });

    this.logger.log('Refreshed Google Calendar access token');

    return data.access_token;
  }

  /**
   * Returns a usable access token, refreshing it first if it's missing or
   * expired. Not yet wired into any sync logic — that's a follow-up task.
   */
  async getValidAccessToken(): Promise<string> {
    const stored = await this.prisma.calendarOAuthToken.findUnique({
      where: { provider: GOOGLE_PROVIDER },
    });
    if (!stored) {
      throw new Error(
        'No Google Calendar tokens stored yet. Visit /calendar/auth first.',
      );
    }

    const isExpired =
      !stored.expiryDate || stored.expiryDate.getTime() <= Date.now();
    if (!isExpired) {
      return stored.accessToken;
    }

    return this.refreshAccessToken();
  }

  async getEvents(): Promise<CalendarEvent[]> {
    const events = await this.prisma.calendarEvent.findMany({
      orderBy: { startTime: 'asc' },
    });

    return events.map((event) => ({
      externalId: event.externalId,
      title: event.title,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      allDay: event.allDay,
      isRecurring: event.isRecurring,
      source: event.source,
      lastSyncedAt: event.lastSyncedAt.toISOString(),
    }));
  }
}
