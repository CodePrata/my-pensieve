export class UpdateProjectDto {
  name?: string;
  repoUrl?: string;
  status?: 'active' | 'paused' | 'done';
  description?: string;
}
