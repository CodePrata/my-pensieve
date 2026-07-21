export interface PriorityCandidateBase {
  id: string;
  title: string;
  dueDate: Date | null;
  importance: 'low' | 'medium' | 'high';
  status: string;
  estimatedDurationMinutes: number | null;
}

export interface StudyCandidate extends PriorityCandidateBase {
  type: 'study_topic';
  examName?: string;
  masteryLevel?: number;
}

export interface ProjectCandidate extends PriorityCandidateBase {
  type: 'project';
  milestones?: string[];
  blockers?: string[];
}

export type PriorityCandidate = StudyCandidate | ProjectCandidate;

export type HydratedPriority = PriorityCandidate & { rank: number };
