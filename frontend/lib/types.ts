export interface CalendarEvent {
  externalId: string;
  title: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  isRecurring: boolean;
  source: string;
  lastSyncedAt: string;
}

export interface SyncEventsResult {
  created: number;
  updated: number;
  total: number;
}

export interface StudyTopic {
  id: string;
  name: string;
  examName: string;
  domain: string;
  status: "not_started" | "in_progress" | "done";
  deadline: string | null;
  notes: string;
}

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  status: "active" | "paused" | "done";
  description: string;
}

export interface BriefingPriority {
  priorityType: "study_topic" | "project";
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

export interface RawItem {
  id: string;
  sourceType: string;
  captureMethod: string;
  sourceUrl: string | null;
  rawFilePath: string;
  capturedAt: string;
  processed: boolean;
}

export interface HydratedPriorityBase {
  id: string;
  title: string;
  dueDate: string | null;
  importance: "low" | "medium" | "high";
  status: string;
  estimatedDurationMinutes: number | null;
  rank: number;
}

export interface HydratedStudyCandidate extends HydratedPriorityBase {
  type: "study_topic";
  examName?: string;
  masteryLevel?: number;
}

export interface HydratedProjectCandidate extends HydratedPriorityBase {
  type: "project";
  milestones?: string[];
  blockers?: string[];
}

export type HydratedPriority =
  | HydratedStudyCandidate
  | HydratedProjectCandidate;

export interface FreeWindow {
  start: string;
  end: string;
  durationMinutes: number;
}

export interface FreeTimeResult {
  windows: FreeWindow[];
  totalFreeMinutes: number;
  largestWindowMinutes: number;
  windowCount: number;
}

export interface LiveBriefingData {
  priorities: HydratedPriority[];
  freeTime: FreeTimeResult;
}

export interface LiveNarrationResult {
  narration: string;
  degraded: boolean;
  degradedReason: string | null;
  generatedAt: string;
}
