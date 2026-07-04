import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
  constructor(private readonly prisma: PrismaService) {}

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
