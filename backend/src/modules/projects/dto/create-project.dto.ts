export class CreateProjectDto {
  name!: string;
  repoUrl!: string;
  status!: 'active' | 'paused' | 'done';
  description?: string;
  importance?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  estimatedDurationMinutes?: number;
}
