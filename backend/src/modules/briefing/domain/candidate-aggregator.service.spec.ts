import { CandidateAggregatorService } from './candidate-aggregator.service';
import { ProjectsService } from '../../projects/projects.service';
import { StudyService } from '../../study/study.service';

describe('CandidateAggregatorService', () => {
  let service: CandidateAggregatorService;
  let studyService: jest.Mocked<Pick<StudyService, 'getTopics'>>;
  let projectsService: jest.Mocked<Pick<ProjectsService, 'getProjects'>>;

  beforeEach(() => {
    studyService = {
      getTopics: jest.fn(),
    };
    projectsService = {
      getProjects: jest.fn(),
    };

    service = new CandidateAggregatorService(
      studyService as unknown as StudyService,
      projectsService as unknown as ProjectsService,
    );
  });

  it('excludes done rows and combines study topics with projects', async () => {
    studyService.getTopics.mockResolvedValue([
      {
        id: 'topic-active',
        name: 'Active topic',
        examName: 'Security+',
        domain: '1.0',
        status: 'in_progress',
        deadline: '2026-08-15',
        notes: '',
        importance: 'high',
        estimatedDurationMinutes: 60,
      },
      {
        id: 'topic-done',
        name: 'Done topic',
        examName: 'Security+',
        domain: '2.0',
        status: 'done',
        deadline: null,
        notes: '',
        importance: 'low',
        estimatedDurationMinutes: null,
      },
    ]);

    projectsService.getProjects.mockResolvedValue([
      {
        id: 'proj-active',
        name: 'Active project',
        repoUrl: 'https://github.com/example/active',
        status: 'active',
        description: '',
        importance: 'medium',
        dueDate: '2026-07-10',
        estimatedDurationMinutes: 45,
      },
      {
        id: 'proj-done',
        name: 'Done project',
        repoUrl: 'https://github.com/example/done',
        status: 'done',
        description: '',
        importance: 'high',
        dueDate: '2026-06-01',
        estimatedDurationMinutes: 30,
      },
    ]);

    const candidates = await service.getCandidates();

    expect(candidates).toHaveLength(2);
    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'topic-active',
      'proj-active',
    ]);
    expect(candidates[0]).toMatchObject({
      type: 'study_topic',
      title: 'Active topic',
      examName: 'Security+',
    });
    expect(candidates[1]).toMatchObject({
      type: 'project',
      title: 'Active project',
      dueDate: new Date('2026-07-10T00:00:00.000Z'),
    });
  });
});
