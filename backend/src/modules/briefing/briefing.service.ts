import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import {
  HydratedPriority,
  PriorityCandidate,
} from './domain/priority-candidate.interface';
import { FreeTimeResult } from './free-time/free-time.interface';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';
import { BriefingNarrationService } from './narration/briefing-narration.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

export interface FullBriefingPayload {
  data: {
    priorities: HydratedPriority[];
    freeTime: FreeTimeResult;
  };
  narration: string;
  degraded: boolean;
  degradedReason: string | null;
}

@Injectable()
export class BriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateAggregator: CandidateAggregatorService,
    private readonly prioritizationEngine: PrioritizationEngineService,
    private readonly freeTimeCalculatorService: FreeTimeCalculatorService,
    private readonly briefingNarrationService: BriefingNarrationService,
  ) {}

  /**
   * Regenerates a full briefing (priorities + free time + narration) purely
   * in-process — no HTTP, no persistence. Used by delivery paths (e.g. the
   * Telegram push endpoint) that need fresh data on demand rather than
   * whatever BriefingSnapshot happens to already exist.
   */
  async generateFullBriefingPayload(): Promise<FullBriefingPayload> {
    const candidates = await this.candidateAggregator.getCandidates();
    const prioritiesDegraded = candidates.length === 0;
    const ranked = this.prioritizationEngine.rank(candidates);
    const priorities = ranked.map(({ candidate, rank }) => ({
      ...candidate,
      rank,
    }));
    const freeTime =
      await this.freeTimeCalculatorService.calculateTodayFreeTime();
    const narrationResult = await this.briefingNarrationService.narrate(
      ranked.map(({ candidate }) => candidate),
      freeTime,
      new Date(),
    );

    const degraded = prioritiesDegraded || narrationResult.degraded;
    const degradedReasons: string[] = [];
    if (prioritiesDegraded) {
      degradedReasons.push('No study or project data available');
    }
    if (narrationResult.degraded && narrationResult.degradedReason) {
      degradedReasons.push(narrationResult.degradedReason);
    }

    return {
      data: { priorities, freeTime },
      narration: narrationResult.narration,
      degraded,
      degradedReason:
        degradedReasons.length > 0 ? degradedReasons.join(', ') : null,
    };
  }

  async generatePriorities(candidates: PriorityCandidate[]) {
    const degraded = candidates.length === 0;
    const ranked = this.prioritizationEngine.rank(candidates);
    const now = new Date();

    return this.prisma.briefingSnapshot.create({
      data: {
        date: startOfDay(now),
        generatedAt: now,
        degraded,
        degradedReason: degraded ? 'No study or project data available' : null,
        priorities: {
          create: ranked.map(({ candidate, rank }) => ({
            priorityType: candidate.type,
            referenceId: candidate.id,
            rank,
          })),
        },
      },
      include: {
        priorities: {
          orderBy: { rank: 'asc' },
        },
      },
    });
  }

  async generateFullBriefing(candidates: PriorityCandidate[]) {
    const now = new Date();
    const prioritiesDegraded = candidates.length === 0;
    const ranked = this.prioritizationEngine.rank(candidates);
    const rankedCandidates = ranked.map(({ candidate }) => candidate);
    const freeTimeResult =
      await this.freeTimeCalculatorService.calculateTodayFreeTime();
    const narrationResult = await this.briefingNarrationService.narrate(
      rankedCandidates,
      freeTimeResult,
      now,
    );

    const degraded = prioritiesDegraded || narrationResult.degraded;
    const degradedReasons: string[] = [];
    if (prioritiesDegraded) {
      degradedReasons.push('No study or project data available');
    }
    if (narrationResult.degraded && narrationResult.degradedReason) {
      degradedReasons.push(narrationResult.degradedReason);
    }

    return this.prisma.briefingSnapshot.create({
      data: {
        date: startOfDay(now),
        generatedAt: now,
        degraded,
        degradedReason:
          degradedReasons.length > 0 ? degradedReasons.join(', ') : null,
        narration: narrationResult.narration,
        priorities: {
          create: ranked.map(({ candidate, rank }) => ({
            priorityType: candidate.type,
            referenceId: candidate.id,
            rank,
          })),
        },
      },
      include: {
        priorities: {
          orderBy: { rank: 'asc' },
        },
      },
    });
  }
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
