import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { calendar_v3, google } from 'googleapis';
import { PrismaService } from '../../prisma/prisma.service';
import { CalendarAuthExpiredError } from './calendar-auth-expired.error';
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
const GOOGLE_CALENDAR_SOURCE = 'google_calendar';
/** Sync window for events.list — balances briefing relevance vs API payload. */
const SYNC_WINDOW_DAYS = 30;
/** Only role that omits event titles/details — nothing meaningful to store. */
const EXCLUDED_ACCESS_ROLE = 'freeBusyReader';

export interface SyncEventsResult {
  created: number;
  updated: number;
  total: number;
}

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
      let parsed: { error?: string } | undefined;
      try {
        parsed = JSON.parse(body) as { error?: string };
      } catch {
        // Non-JSON body — treat as a transient refresh failure.
      }
      if (parsed?.error === 'invalid_grant') {
        throw new CalendarAuthExpiredError();
      }
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
   * expired.
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

  /**
   * Fetches upcoming events from all owned/writable Google calendars and
   * upserts them locally, keyed on Google's event id (`externalId`).
   */
  async syncEvents(): Promise<SyncEventsResult> {
    const accessToken = await this.getValidAccessToken();
    const calendar = this.createGoogleCalendarClient(accessToken);
    const syncableCalendars = await this.fetchSyncableCalendars(calendar);

    const googleEvents: calendar_v3.Schema$Event[] = [];
    for (const entry of syncableCalendars) {
      const events = await this.fetchGoogleCalendarEvents(calendar, entry.id!);
      googleEvents.push(...events);
      this.logger.log(
        `Fetched ${events.length} event(s) from calendar "${entry.summary ?? entry.id}"`,
      );
    }

    const now = new Date();

    const externalIds = googleEvents
      .map((event) => event.id)
      .filter((id): id is string => Boolean(id));

    const existingRows = await this.prisma.calendarEvent.findMany({
      where: { externalId: { in: externalIds } },
      select: { externalId: true },
    });
    const existingIds = new Set(existingRows.map((row) => row.externalId));

    let created = 0;
    let updated = 0;

    for (const event of googleEvents) {
      if (!event.id || event.status === 'cancelled') {
        continue;
      }

      const mapped = this.mapGoogleEvent(event, now);
      await this.prisma.calendarEvent.upsert({
        where: { externalId: event.id },
        create: mapped,
        update: mapped,
      });

      if (existingIds.has(event.id)) {
        updated++;
      } else {
        created++;
      }
    }

    this.logger.log(
      `Google Calendar sync complete: ${created} created, ${updated} updated (${googleEvents.length} fetched from ${syncableCalendars.length} calendar(s))`,
    );

    return { created, updated, total: created + updated };
  }

  private createGoogleCalendarClient(accessToken: string) {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    return google.calendar({ version: 'v3', auth });
  }

  private async fetchSyncableCalendars(
    calendar: calendar_v3.Calendar,
  ): Promise<calendar_v3.Schema$CalendarListEntry[]> {
    const entries: calendar_v3.Schema$CalendarListEntry[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendar.calendarList.list({
        maxResults: 250,
        pageToken,
      });

      entries.push(...(response.data.items ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    const syncable = entries.filter(
      (entry) =>
        entry.id && !entry.deleted && entry.accessRole !== EXCLUDED_ACCESS_ROLE,
    );

    const skipped = entries.filter(
      (entry) =>
        entry.id && !entry.deleted && entry.accessRole === EXCLUDED_ACCESS_ROLE,
    );

    for (const entry of syncable) {
      this.logger.log(
        `Syncing calendar "${entry.summary ?? entry.id}" (accessRole=${entry.accessRole})`,
      );
    }
    for (const entry of skipped) {
      this.logger.log(
        `Skipping calendar "${entry.summary ?? entry.id}" (accessRole=${entry.accessRole}, free/busy only)`,
      );
    }

    return syncable;
  }

  private async fetchGoogleCalendarEvents(
    calendar: calendar_v3.Calendar,
    calendarId: string,
  ): Promise<calendar_v3.Schema$Event[]> {
    const timeMin = new Date();
    const timeMax = new Date(
      Date.now() + SYNC_WINDOW_DAYS * 24 * 60 * 60 * 1000,
    );

    const events: calendar_v3.Schema$Event[] = [];
    let pageToken: string | undefined;

    do {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
        pageToken,
      });

      events.push(...(response.data.items ?? []));
      pageToken = response.data.nextPageToken ?? undefined;
    } while (pageToken);

    return events;
  }

  private mapGoogleEvent(event: calendar_v3.Schema$Event, lastSyncedAt: Date) {
    const allDay = Boolean(event.start?.date && !event.start?.dateTime);
    const { startTime, endTime } = allDay
      ? this.parseAllDayTimes(event.start!.date!, event.end!.date!)
      : {
          startTime: new Date(event.start!.dateTime!),
          endTime: new Date(event.end!.dateTime!),
        };

    return {
      externalId: event.id!,
      title: event.summary?.trim() || '(No title)',
      startTime,
      endTime,
      allDay,
      isRecurring: Boolean(
        (event.recurrence?.length ?? 0) > 0 || event.recurringEventId,
      ),
      source: GOOGLE_CALENDAR_SOURCE,
      lastSyncedAt,
    };
  }

  /**
   * Google all-day events use `date` (YYYY-MM-DD) with an exclusive end
   * date. Store both boundaries at UTC midnight to match Google's model.
   */
  private parseAllDayTimes(startDate: string, endDate: string) {
    return {
      startTime: new Date(`${startDate}T00:00:00.000Z`),
      endTime: new Date(`${endDate}T00:00:00.000Z`),
    };
  }

  async getEvents(): Promise<CalendarEvent[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: { endTime: { gte: new Date() } },
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

  async getEventsInRange(start: Date, end: Date): Promise<CalendarEvent[]> {
    const events = await this.prisma.calendarEvent.findMany({
      where: {
        startTime: { lt: end },
        endTime: { gt: start },
      },
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
