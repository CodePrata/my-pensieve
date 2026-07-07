export class CreateProjectDto {
  name!: string;
  repoUrl!: string;
  status!: 'active' | 'paused' | 'done';
  description?: string;
}
