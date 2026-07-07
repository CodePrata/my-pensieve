export class UpdateProjectDto {
  name?: string;
  repoUrl?: string;
  status?: 'active' | 'paused' | 'done';
  description?: string;
  importance?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  estimatedDurationMinutes?: number | null;
}
