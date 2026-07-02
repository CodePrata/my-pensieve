import { Injectable } from '@nestjs/common';

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  status: 'active' | 'paused' | 'done';
  description: string;
}

@Injectable()
export class ProjectsService {
  getProjects(): Project[] {
    return [
      {
        id: 'proj-001',
        name: 'My Pensieve',
        repoUrl: 'https://github.com/example/my-pensieve',
        status: 'active',
        description: 'Personal knowledge and briefing dashboard.',
      },
      {
        id: 'proj-002',
        name: 'Capture Bot',
        repoUrl: 'https://github.com/example/capture-bot',
        status: 'paused',
        description: 'Telegram listener for vault captures.',
      },
    ];
  }
}
