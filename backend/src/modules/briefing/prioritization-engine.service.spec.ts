import { PrioritizationEngineService } from './prioritization-engine.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';

describe('PrioritizationEngineService', () => {
  let service: PrioritizationEngineService;

  const today = startOfDay(new Date());
  const yesterday = addDays(today, -1);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  beforeEach(() => {
    service = new PrioritizationEngineService();
  });

  it('ranks overdue ahead of due today', () => {
    const candidates: PriorityCandidate[] = [
      study('due-today', 'Due today item', today),
      study('overdue', 'Overdue item', yesterday),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'overdue',
      'due-today',
    ]);
    expect(ranked.map(({ rank }) => rank)).toEqual([1, 2]);
  });

  it('ranks due today ahead of due tomorrow', () => {
    const candidates: PriorityCandidate[] = [
      study('due-tomorrow', 'Due tomorrow item', tomorrow),
      study('due-today', 'Due today item', today),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'due-today',
      'due-tomorrow',
    ]);
  });

  it('ranks due tomorrow ahead of high-importance projects', () => {
    const candidates: PriorityCandidate[] = [
      project('high-project', 'High project', null, 'high'),
      study('due-tomorrow', 'Due tomorrow item', tomorrow),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'due-tomorrow',
      'high-project',
    ]);
  });

  it('ranks high-importance projects ahead of everything else', () => {
    const candidates: PriorityCandidate[] = [
      study('medium-future', 'Medium future item', nextWeek, 'medium'),
      project('high-project', 'High project', nextWeek, 'high'),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'high-project',
      'medium-future',
    ]);
  });

  it('orders everything-else tier by importance high > medium > low', () => {
    const candidates: PriorityCandidate[] = [
      study('low', 'Low item', nextWeek, 'low'),
      study('high', 'High item', nextWeek, 'high'),
      study('medium', 'Medium item', nextWeek, 'medium'),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'high',
      'medium',
      'low',
    ]);
  });

  it('uses due date ascending as a tiebreak within everything else', () => {
    const candidates: PriorityCandidate[] = [
      study('later', 'Later item', addDays(today, 10), 'medium'),
      study('sooner', 'Sooner item', addDays(today, 3), 'medium'),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'sooner',
      'later',
    ]);
  });

  it('uses alphabetical title as the final tiebreak', () => {
    const candidates: PriorityCandidate[] = [
      study('zebra', 'Zebra item', null, 'medium'),
      study('alpha', 'Alpha item', null, 'medium'),
    ];

    const ranked = service.rank(candidates);

    expect(ranked.map(({ candidate }) => candidate.id)).toEqual([
      'alpha',
      'zebra',
    ]);
  });

  it('returns an empty array without throwing for empty input', () => {
    expect(service.rank([])).toEqual([]);
  });
});

function study(
  id: string,
  title: string,
  dueDate: Date | null,
  importance: PriorityCandidate['importance'] = 'medium',
): PriorityCandidate {
  return {
    id,
    title,
    dueDate,
    importance,
    status: 'active',
    estimatedDurationMinutes: 30,
    type: 'study_topic',
  };
}

function project(
  id: string,
  title: string,
  dueDate: Date | null,
  importance: PriorityCandidate['importance'] = 'medium',
): PriorityCandidate {
  return {
    id,
    title,
    dueDate,
    importance,
    status: 'active',
    estimatedDurationMinutes: 60,
    type: 'project',
  };
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
