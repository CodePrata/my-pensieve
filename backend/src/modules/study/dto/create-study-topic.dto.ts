export class CreateStudyTopicDto {
  name!: string;
  examName!: string;
  domain!: string;
  status!: 'not_started' | 'in_progress' | 'done';
  deadline?: string | null;
  notes?: string;
  importance?: 'low' | 'medium' | 'high';
  estimatedDurationMinutes?: number;
}
