import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { BriefingService } from './briefing.service';
import { PriorityCandidate } from './domain/priority-candidate.interface';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';
import { BriefingNarrationService } from './narration/briefing-narration.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

describe('BriefingService', () => {
  let service: BriefingService;

  const prisma = {
    briefingSnapshot: {
      create: jest.fn(),
    },
  };

  const prioritizationEngine = {
    rank: jest.fn(),
  };

  const freeTimeCalculatorService = {
    calculateTodayFreeTime: jest.fn(),
  };

  const briefingNarrationService = {
    narrate: jest.fn(),
  };

  const studyCandidate: PriorityCandidate = {
    id: 'topic-1',
    type: 'study_topic',
    title: 'Cryptography basics',
    dueDate: new Date('2026-08-15'),
    importance: 'high',
    status: 'in_progress',
    estimatedDurationMinutes: 60,
  };

  const projectCandidate: PriorityCandidate = {
    id: 'proj-1',
    type: 'project',
    title: 'My Pensieve',
    dueDate: new Date('2026-07-10'),
    importance: 'medium',
    status: 'active',
    estimatedDurationMinutes: 45,
  };

  const freeTimeResult = {
    windows: [],
    totalFreeMinutes: 120,
    largestWindowMinutes: 120,
    windowCount: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BriefingService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PrioritizationEngineService,
          useValue: prioritizationEngine,
        },
        {
          provide: FreeTimeCalculatorService,
          useValue: freeTimeCalculatorService,
        },
        {
          provide: BriefingNarrationService,
          useValue: briefingNarrationService,
        },
      ],
    }).compile();

    service = module.get(BriefingService);

    freeTimeCalculatorService.calculateTodayFreeTime.mockResolvedValue(
      freeTimeResult,
    );
    briefingNarrationService.narrate.mockResolvedValue({
      narration: 'Good Morning there,\nYour primary focus should be on My Pensieve.',
      degraded: false,
      degradedReason: null,
    });
    prisma.briefingSnapshot.create.mockResolvedValue({
      id: 'snapshot-1',
      narration: 'Good Morning there,\nYour primary focus should be on My Pensieve.',
      degraded: false,
      degradedReason: null,
      generatedAt: new Date('2026-07-09T06:40:00.000Z'),
      priorities: [],
    });
  });

  describe('generateFullBriefing', () => {
    it('passes ranked candidates to narrate(), not the original aggregator order', async () => {
      const aggregatorOrder = [studyCandidate, projectCandidate];
      prioritizationEngine.rank.mockReturnValue([
        { candidate: projectCandidate, rank: 1 },
        { candidate: studyCandidate, rank: 2 },
      ]);

      await service.generateFullBriefing(aggregatorOrder);

      expect(briefingNarrationService.narrate).toHaveBeenCalledWith(
        [projectCandidate, studyCandidate],
        freeTimeResult,
        expect.any(Date),
      );
    });
  });
});
