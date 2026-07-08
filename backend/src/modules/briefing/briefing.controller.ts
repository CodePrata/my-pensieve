import { Controller, Get, Post } from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';
import { SnapshotBlockCacheService } from './domain/snapshot-block-cache.service';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

export type HydratedPriority = PriorityCandidate & { rank: number };

@Controller('briefing')
export class BriefingController {
  constructor(
    private readonly briefingService: BriefingService,
    private readonly candidateAggregator: CandidateAggregatorService,
    private readonly freeTimeCalculatorService: FreeTimeCalculatorService,
    private readonly prioritizationEngine: PrioritizationEngineService,
    private readonly snapshotBlockCacheService: SnapshotBlockCacheService,
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

  @Get('live-data')
  async getLiveData(): Promise<{
    priorities: HydratedPriority[];
    freeTime: Awaited<
      ReturnType<FreeTimeCalculatorService['calculateTodayFreeTime']>
    >;
  }> {
    const candidates = await this.candidateAggregator.getCandidates();
    const ranked = this.prioritizationEngine.rank(candidates);
    const priorities = ranked.map(({ candidate, rank }) => ({
      ...candidate,
      rank,
    }));
    const freeTime =
      await this.freeTimeCalculatorService.calculateTodayFreeTime();

    return { priorities, freeTime };
  }

  @Get('live-narration')
  async getLiveNarration(): Promise<{
    narration: string | null;
    degraded: boolean;
    degradedReason: string | null;
    generatedAt: Date;
  }> {
    const now = new Date();
    const cached =
      await this.snapshotBlockCacheService.findSnapshotForCurrentBlock(now);

    if (cached) {
      return {
        narration: cached.narration,
        degraded: cached.degraded,
        degradedReason: cached.degradedReason,
        generatedAt: cached.generatedAt,
      };
    }

    const candidates = await this.candidateAggregator.getCandidates();
    const snapshot =
      await this.briefingService.generateFullBriefing(candidates);

    return {
      narration: snapshot.narration,
      degraded: snapshot.degraded,
      degradedReason: snapshot.degradedReason,
      generatedAt: snapshot.generatedAt,
    };
  }
}
