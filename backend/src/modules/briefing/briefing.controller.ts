import { Controller, Get, Post } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';

@Controller('briefing')
export class BriefingController {
  constructor(
    private readonly briefingService: BriefingService,
    private readonly candidateAggregator: CandidateAggregatorService,
    private readonly freeTimeCalculatorService: FreeTimeCalculatorService,
  ) {}

  @Get()
  getCurrentBriefing() {
    return this.briefingService.getCurrentBriefing();
  }

  @Post('generate')
  async generatePriorities() {
    const candidates = await this.candidateAggregator.getCandidates();
    return this.briefingService.generatePriorities(candidates);
  }

  @Post('generate-full')
  async generateFullBriefing() {
    const candidates = await this.candidateAggregator.getCandidates();
    return this.briefingService.generateFullBriefing(candidates);
  }

  @Get('free-time')
  getFreeTime() {
    return this.freeTimeCalculatorService.calculateTodayFreeTime();
  }
}
