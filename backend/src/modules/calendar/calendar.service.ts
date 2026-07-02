import { Injectable } from '@nestjs/common';

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

@Injectable()
export class CalendarService {
  getEvents(): CalendarEvent[] {
    return [
      {
        externalId: 'gcal-001',
        title: 'Security+ study block',
        startTime: '2026-07-02T09:00:00.000Z',
        endTime: '2026-07-02T11:00:00.000Z',
        allDay: false,
        isRecurring: true,
        source: 'google_calendar',
        lastSyncedAt: '2026-07-02T08:00:00.000Z',
      },
      {
        externalId: 'gcal-002',
        title: 'Team standup',
        startTime: '2026-07-02T14:00:00.000Z',
        endTime: '2026-07-02T14:30:00.000Z',
        allDay: false,
        isRecurring: true,
        source: 'google_calendar',
        lastSyncedAt: '2026-07-02T08:00:00.000Z',
      },
    ];
  }
}
