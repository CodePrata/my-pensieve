import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';
import { PrioritizationEngineService } from './prioritization-engine.service';

export interface BriefingPriority {
  priorityType: 'study_topic' | 'project';
  referenceId: string;
  rank: number;
  label: string;
}

export interface BriefingSnapshot {
  date: string;
  generatedAt: string;
  degraded: boolean;
  degradedReason: string | null;
  priorities: BriefingPriority[];
  narration: string;
}

@Injectable()
export class BriefingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly prioritizationEngine: PrioritizationEngineService,
  ) {}

  getCurrentBriefing(): BriefingSnapshot {
    return {
      date: '2026-07-02',
      generatedAt: '2026-07-02T08:30:00.000Z',
      degraded: false,
      degradedReason: null,
      priorities: [
        {
          priorityType: 'study_topic',
          referenceId: 'topic-001',
          rank: 1,
          label: 'Cryptography basics',
        },
        {
          priorityType: 'project',
          referenceId: 'proj-001',
          rank: 2,
          label: 'My Pensieve',
        },
      ],
      narration:
        'Morning is open until standup. Focus on Security+ cryptography, then a short coding session on the dashboard.',
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
        degradedReason: degraded
          ? 'No study or project data available'
          : null,
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
