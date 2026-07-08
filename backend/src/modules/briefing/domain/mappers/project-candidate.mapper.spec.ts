import { Project } from '../../../projects/projects.service';
import { mapProjectToCandidate } from './project-candidate.mapper';

describe('mapProjectToCandidate', () => {
  it('maps a normal project row', () => {
    const project: Project = {
      id: 'proj-001',
      name: 'My Pensieve',
      repoUrl: 'https://github.com/example/my-pensieve',
      status: 'active',
      description: 'Personal knowledge and briefing dashboard.',
      importance: 'high',
      dueDate: '2026-07-01',
      estimatedDurationMinutes: 120,
    };

    expect(mapProjectToCandidate(project)).toEqual({
      type: 'project',
      id: 'proj-001',
      title: 'My Pensieve',
      dueDate: new Date('2026-07-01T00:00:00.000Z'),
      importance: 'high',
      status: 'active',
      estimatedDurationMinutes: 120,
    });
  });

  it('maps a project with null dueDate', () => {
    const project: Project = {
      id: 'proj-002',
      name: 'Capture Bot',
      repoUrl: 'https://github.com/example/capture-bot',
      status: 'paused',
      description: 'Telegram listener for vault captures.',
      importance: 'medium',
      dueDate: null,
      estimatedDurationMinutes: null,
    };

    expect(mapProjectToCandidate(project)).toEqual({
      type: 'project',
      id: 'proj-002',
      title: 'Capture Bot',
      dueDate: null,
      importance: 'medium',
      status: 'paused',
      estimatedDurationMinutes: null,
    });
  });
});
