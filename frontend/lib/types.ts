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
  importance: "low" | "medium" | "high";
  estimatedDurationMinutes: number | null;
}

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  status: "active" | "paused" | "done";
  description: string;
  importance: "low" | "medium" | "high";
  dueDate: string | null;
  estimatedDurationMinutes: number | null;
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

export interface InboxResult {
  items: RawItem[];
  totalCount: number;
  unprocessedCount: number;
  hasMore: boolean;
  lastVaultSyncedAt: string | null;
}

export interface SyncRawItemsResult {
  created: number;
  skipped: number;
  syncedAt: string;
}

export interface ProcessInboxFailure {
  rawItemId: string;
  reason: string;
}

export interface ProcessInboxResult {
  processed: number;
  failed: number;
  failures: ProcessInboxFailure[];
}

export interface GithubSyncFailure {
  repoUrl: string;
  reason: string;
}

export interface GithubSyncResult {
  reposChecked: number;
  filesWritten: number;
  failures: GithubSyncFailure[];
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

export interface PushBriefingResult {
  sent: true;
}

export type PushBriefingErrorType =
  | "telegram_auth_failed"
  | "telegram_chat_not_found"
  | "transient";

export interface PushBriefingError {
  statusCode: number;
  message: string;
  errorType: PushBriefingErrorType;
  error: string;
}
