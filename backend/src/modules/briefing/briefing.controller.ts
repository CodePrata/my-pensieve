import { Body, Controller, Get, Post } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';

@Controller('briefing')
export class BriefingController {
  constructor(private readonly briefingService: BriefingService) {}

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
}
