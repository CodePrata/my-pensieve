import { Project } from '../../../projects/projects.service';
import { ProjectCandidate } from '../priority-candidate.interface';

export function mapProjectToCandidate(project: Project): ProjectCandidate {
  return {
    type: 'project',
    id: project.id,
    title: project.name,
    dueDate: parseDateOnly(project.dueDate),
    importance: project.importance,
    status: project.status,
    estimatedDurationMinutes: project.estimatedDurationMinutes,
  };
}

function parseDateOnly(value: string | null): Date | null {
  if (value === null || value === '') {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}
