import { Module } from '@nestjs/common';
import { CalendarModule } from '../../calendar/calendar.module';
import { FreeTimeCalculatorService } from './free-time-calculator.service';

@Module({
  imports: [CalendarModule],
  providers: [FreeTimeCalculatorService],
  exports: [FreeTimeCalculatorService],
})
export class FreeTimeModule {}
