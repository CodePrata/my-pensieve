import { Injectable } from '@nestjs/common';
import { ProjectsService } from '../../projects/projects.service';
import { StudyService } from '../../study/study.service';
import { mapProjectToCandidate } from './mappers/project-candidate.mapper';
import { mapStudyTopicToCandidate } from './mappers/study-candidate.mapper';
import { PriorityCandidate } from './priority-candidate.interface';

@Injectable()
export class CandidateAggregatorService {
  constructor(
    private readonly studyService: StudyService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getCandidates(): Promise<PriorityCandidate[]> {
    const [topics, projects] = await Promise.all([
      this.studyService.getTopics(),
      this.projectsService.getProjects(),
    ]);

    const studyCandidates = topics
      .filter((topic) => topic.status !== 'done')
      .map(mapStudyTopicToCandidate);

    const projectCandidates = projects
      .filter((project) => project.status !== 'done')
      .map(mapProjectToCandidate);

    return [...studyCandidates, ...projectCandidates];
  }
}
