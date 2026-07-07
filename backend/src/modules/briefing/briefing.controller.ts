import { Body, Controller, Get, Post } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';

@Controller('briefing')
export class BriefingController {
  constructor(
    private readonly briefingService: BriefingService,
    private readonly freeTimeCalculatorService: FreeTimeCalculatorService,
  ) {}

  @Get()
  getCurrentBriefing() {
    return this.briefingService.getCurrentBriefing();
  }

  @Post('generate')
  generatePriorities(@Body() body: { candidates?: PriorityCandidate[] }) {
    // Temporary testing shim — not the permanent API contract.
    // Candidates are supplied in the request body until StudyTopic/Project
    // models and their mapping layer exist.
    return this.briefingService.generatePriorities(body.candidates ?? []);
  }

  @Post('generate-full')
  generateFullBriefing(@Body() body: { candidates?: PriorityCandidate[] }) {
    return this.briefingService.generateFullBriefing(body.candidates ?? []);
  }

  @Get('free-time')
  getFreeTime() {
    return this.freeTimeCalculatorService.calculateTodayFreeTime();
  }
}
