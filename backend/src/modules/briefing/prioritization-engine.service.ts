import { Injectable } from '@nestjs/common';
import { PriorityCandidate } from './domain/priority-candidate.interface';

export interface RankedCandidate {
  candidate: PriorityCandidate;
  rank: number;
}

const IMPORTANCE_ORDER: Record<PriorityCandidate['importance'], number> = {
  high: 0,
  medium: 1,
  low: 2,
};

@Injectable()
export class PrioritizationEngineService {
  rank(candidates: PriorityCandidate[]): RankedCandidate[] {
    if (candidates.length === 0) {
      return [];
    }

    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);

    const sorted = [...candidates].sort((left, right) => {
      const tierDiff =
        getTier(left, today, tomorrow) - getTier(right, today, tomorrow);
      if (tierDiff !== 0) {
        return tierDiff;
      }

      return compareWithinTier(left, right, getTier(left, today, tomorrow));
    });

    return sorted.map((candidate, index) => ({
      candidate,
      rank: index + 1,
    }));
  }
}

function getTier(
  candidate: PriorityCandidate,
  today: Date,
  tomorrow: Date,
): number {
  if (candidate.status !== 'done' && candidate.dueDate) {
    const dueDay = startOfDay(candidate.dueDate);
    if (dueDay < today) {
      return 1;
    }
    if (dueDay.getTime() === today.getTime()) {
      return 2;
    }
    if (dueDay.getTime() === tomorrow.getTime()) {
      return 3;
    }
  }

  if (candidate.type === 'project' && candidate.importance === 'high') {
    return 4;
  }

  return 5;
}

function compareWithinTier(
  left: PriorityCandidate,
  right: PriorityCandidate,
  tier: number,
): number {
  if (tier === 5) {
    const importanceDiff =
      IMPORTANCE_ORDER[left.importance] - IMPORTANCE_ORDER[right.importance];
    if (importanceDiff !== 0) {
      return importanceDiff;
    }

    const dueDateDiff = compareDueDateAscNullsLast(left.dueDate, right.dueDate);
    if (dueDateDiff !== 0) {
      return dueDateDiff;
    }

    return left.title.localeCompare(right.title);
  }

  const dueDateDiff = compareDueDateAscNullsLast(left.dueDate, right.dueDate);
  if (dueDateDiff !== 0) {
    return dueDateDiff;
  }

  const importanceDiff =
    IMPORTANCE_ORDER[left.importance] - IMPORTANCE_ORDER[right.importance];
  if (importanceDiff !== 0) {
    return importanceDiff;
  }

  return left.title.localeCompare(right.title);
}

function compareDueDateAscNullsLast(
  left: Date | null,
  right: Date | null,
): number {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }

  return startOfDay(left).getTime() - startOfDay(right).getTime();
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
