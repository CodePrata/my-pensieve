import { HttpException } from '@nestjs/common';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import { SnapshotBlockCacheService } from './domain/snapshot-block-cache.service';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';
import { PrioritizationEngineService } from './prioritization-engine.service';
import {
  TelegramAuthFailedError,
  TelegramChatNotFoundError,
  TelegramTransientError,
} from './telegram-push.errors';
import { TelegramPushService } from './telegram-push.service';

describe('BriefingController', () => {
  let controller: BriefingController;
  let candidateAggregator: jest.Mocked<
    Pick<CandidateAggregatorService, 'getCandidates'>
  >;
  let prioritizationEngine: PrioritizationEngineService;
  let freeTimeCalculatorService: jest.Mocked<
    Pick<FreeTimeCalculatorService, 'calculateTodayFreeTime'>
  >;
  let briefingService: jest.Mocked<
    Pick<
      BriefingService,
      | 'generatePriorities'
      | 'generateFullBriefing'
      | 'generateFullBriefingPayload'
    >
  >;
  let snapshotBlockCacheService: jest.Mocked<
    Pick<SnapshotBlockCacheService, 'findSnapshotForCurrentBlock'>
  >;
  let telegramPushService: jest.Mocked<
    Pick<TelegramPushService, 'sendBriefingToTelegram'>
  >;

  beforeEach(() => {
    candidateAggregator = {
      getCandidates: jest.fn(),
    };
    prioritizationEngine = new PrioritizationEngineService();
    freeTimeCalculatorService = {
      calculateTodayFreeTime: jest.fn(),
    };
    briefingService = {
      generatePriorities: jest.fn(),
      generateFullBriefing: jest.fn(),
      generateFullBriefingPayload: jest.fn(),
    };
    snapshotBlockCacheService = {
      findSnapshotForCurrentBlock: jest.fn(),
    };
    telegramPushService = {
      sendBriefingToTelegram: jest.fn(),
    };

    controller = new BriefingController(
      briefingService as unknown as BriefingService,
      candidateAggregator as unknown as CandidateAggregatorService,
      freeTimeCalculatorService as unknown as FreeTimeCalculatorService,
      prioritizationEngine,
      snapshotBlockCacheService as unknown as SnapshotBlockCacheService,
      telegramPushService as unknown as TelegramPushService,
    );
  });

  describe('GET /briefing/live-data', () => {
    it('returns fully hydrated priority candidates with rank and free time', async () => {
      const today = startOfDay(new Date());
      const studyCandidate = {
        id: 'topic-1',
        type: 'study_topic' as const,
        title: 'Cryptography basics',
        dueDate: addDays(today, 1),
        importance: 'high' as const,
        status: 'in_progress',
        estimatedDurationMinutes: 60,
        examName: 'Security+',
      };
      const projectCandidate = {
        id: 'proj-1',
        type: 'project' as const,
        title: 'My Pensieve',
        dueDate: addDays(today, 30),
        importance: 'medium' as const,
        status: 'active',
        estimatedDurationMinutes: 45,
        milestones: ['Dashboard'],
        blockers: ['OAuth setup'],
      };

      candidateAggregator.getCandidates.mockResolvedValue([
        studyCandidate,
        projectCandidate,
      ]);
      freeTimeCalculatorService.calculateTodayFreeTime.mockResolvedValue({
        windows: [],
        totalFreeMinutes: 120,
        largestWindowMinutes: 120,
        windowCount: 1,
      });

      const result = await controller.getLiveData();

      expect(result.freeTime).toEqual({
        windows: [],
        totalFreeMinutes: 120,
        largestWindowMinutes: 120,
        windowCount: 1,
      });
      expect(result.priorities).toHaveLength(2);
      expect(result.priorities[0]).toMatchObject({
        id: 'topic-1',
        type: 'study_topic',
        title: 'Cryptography basics',
        status: 'in_progress',
        importance: 'high',
        dueDate: studyCandidate.dueDate,
        rank: 1,
        examName: 'Security+',
      });
      expect(result.priorities[1]).toMatchObject({
        id: 'proj-1',
        type: 'project',
        title: 'My Pensieve',
        status: 'active',
        importance: 'medium',
        dueDate: projectCandidate.dueDate,
        rank: 2,
        milestones: ['Dashboard'],
        blockers: ['OAuth setup'],
      });
    });
  });

  describe('POST /briefing/push', () => {
    const fullBriefingPayload = {
      data: {
        priorities: [],
        freeTime: {
          windows: [],
          totalFreeMinutes: 0,
          largestWindowMinutes: 0,
          windowCount: 0,
        },
      },
      narration: 'Good morning.',
      degraded: false,
      degradedReason: null,
    };

    it('returns { sent: true } on success without touching live-data/live-narration', async () => {
      briefingService.generateFullBriefingPayload.mockResolvedValue(
        fullBriefingPayload,
      );
      telegramPushService.sendBriefingToTelegram.mockResolvedValue(undefined);

      const result = await controller.pushBriefing();

      expect(result).toEqual({ sent: true });
      expect(candidateAggregator.getCandidates).not.toHaveBeenCalled();
    });

    it('maps TelegramAuthFailedError to a 401 telegram_auth_failed HttpException', async () => {
      briefingService.generateFullBriefingPayload.mockResolvedValue(
        fullBriefingPayload,
      );
      telegramPushService.sendBriefingToTelegram.mockRejectedValue(
        new TelegramAuthFailedError('bad token'),
      );

      const error = await controller
        .pushBriefing()
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ status: 401 });
      expect((error as HttpException).getResponse()).toMatchObject({
        errorType: 'telegram_auth_failed',
      });
    });

    it('maps TelegramChatNotFoundError to a 404 telegram_chat_not_found HttpException', async () => {
      briefingService.generateFullBriefingPayload.mockResolvedValue(
        fullBriefingPayload,
      );
      telegramPushService.sendBriefingToTelegram.mockRejectedValue(
        new TelegramChatNotFoundError('no chat'),
      );

      const error = await controller
        .pushBriefing()
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ status: 404 });
      expect((error as HttpException).getResponse()).toMatchObject({
        errorType: 'telegram_chat_not_found',
      });
    });

    it('maps TelegramTransientError to a 502 transient HttpException', async () => {
      briefingService.generateFullBriefingPayload.mockResolvedValue(
        fullBriefingPayload,
      );
      telegramPushService.sendBriefingToTelegram.mockRejectedValue(
        new TelegramTransientError('network down'),
      );

      const error = await controller
        .pushBriefing()
        .catch((caught: unknown) => caught);
      expect(error).toMatchObject({ status: 502 });
      expect((error as HttpException).getResponse()).toMatchObject({
        errorType: 'transient',
      });
    });

    it('never lets an unhandled exception 500 out', async () => {
      briefingService.generateFullBriefingPayload.mockRejectedValue(
        new Error('unexpected'),
      );

      await expect(controller.pushBriefing()).rejects.toBeInstanceOf(
        HttpException,
      );
    });
  });
});

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
