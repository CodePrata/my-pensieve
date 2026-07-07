import { Injectable } from '@nestjs/common';
import { CalendarService } from '../../calendar/calendar.service';
import { computeFreeTime } from './free-time-calculation';
import { FreeTimeResult } from './free-time.interface';

@Injectable()
export class FreeTimeCalculatorService {
  constructor(private readonly calendarService: CalendarService) {}

  /**
   * Computes contiguous free windows for the remainder of today.
   *
   * ADR-003: single-user, single-machine deployment — "now" and end-of-day
   * use the backend server's local timezone. No user timezone preference.
   */
  async calculateTodayFreeTime(
    minimumGapMinutes = 15,
  ): Promise<FreeTimeResult> {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const events = await this.calendarService.getEventsInRange(now, endOfDay);

    return computeFreeTime(now, endOfDay, events, minimumGapMinutes);
  }
}
