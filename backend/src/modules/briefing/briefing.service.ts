import { Injectable } from '@nestjs/common';

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
}
