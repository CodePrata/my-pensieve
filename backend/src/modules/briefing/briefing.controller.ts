import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { BriefingService } from './briefing.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import { HydratedPriority } from './domain/priority-candidate.interface';
import { SnapshotBlockCacheService } from './domain/snapshot-block-cache.service';
import { FreeTimeCalculatorService } from './free-time/free-time-calculator.service';
import { PrioritizationEngineService } from './prioritization-engine.service';
import {
  TelegramAuthFailedError,
  TelegramChatNotFoundError,
} from './telegram-push.errors';
import { TelegramPushService } from './telegram-push.service';

@Controller('briefing')
export class BriefingController {
  private readonly logger = new Logger(BriefingController.name);

  constructor(
    private readonly briefingService: BriefingService,
    private readonly candidateAggregator: CandidateAggregatorService,
    private readonly freeTimeCalculatorService: FreeTimeCalculatorService,
    private readonly prioritizationEngine: PrioritizationEngineService,
    private readonly snapshotBlockCacheService: SnapshotBlockCacheService,
    private readonly telegramPushService: TelegramPushService,
  ) {}

  @Post('generate')
  async generatePriorities() {
    const candidates = await this.candidateAggregator.getCandidates();
    return this.briefingService.generatePriorities(candidates);
  }

  @Post('generate-full')
  async generateFullBriefing() {
    const candidates = await this.candidateAggregator.getCandidates();
    return this.briefingService.generateFullBriefing(candidates);
  }

  @Get('free-time')
  getFreeTime() {
    return this.freeTimeCalculatorService.calculateTodayFreeTime();
  }

  @Get('live-data')
  async getLiveData(): Promise<{
    priorities: HydratedPriority[];
    freeTime: Awaited<
      ReturnType<FreeTimeCalculatorService['calculateTodayFreeTime']>
    >;
  }> {
    const candidates = await this.candidateAggregator.getCandidates();
    const ranked = this.prioritizationEngine.rank(candidates);
    const priorities = ranked.map(({ candidate, rank }) => ({
      ...candidate,
      rank,
    }));
    const freeTime =
      await this.freeTimeCalculatorService.calculateTodayFreeTime();

    return { priorities, freeTime };
  }

  @Get('live-narration')
  async getLiveNarration(): Promise<{
    narration: string | null;
    degraded: boolean;
    degradedReason: string | null;
    generatedAt: Date;
  }> {
    const now = new Date();
    const cached =
      await this.snapshotBlockCacheService.findSnapshotForCurrentBlock(now);

    if (cached) {
      return {
        narration: cached.narration,
        degraded: cached.degraded,
        degradedReason: cached.degradedReason,
        generatedAt: cached.generatedAt,
      };
    }

    const candidates = await this.candidateAggregator.getCandidates();
    const snapshot =
      await this.briefingService.generateFullBriefing(candidates);

    return {
      narration: snapshot.narration,
      degraded: snapshot.degraded,
      degradedReason: snapshot.degradedReason,
      generatedAt: snapshot.generatedAt,
    };
  }

  @Post('push')
  async pushBriefing(): Promise<{ sent: true }> {
    try {
      const briefing = await this.briefingService.generateFullBriefingPayload();
      await this.telegramPushService.sendBriefingToTelegram(briefing);
      return { sent: true };
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown push error';
      this.logger.error(
        `Telegram briefing push failed: ${detail}`,
        error instanceof Error ? error.stack : undefined,
      );

      if (error instanceof TelegramAuthFailedError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.UNAUTHORIZED,
            message: 'Telegram briefing push failed',
            errorType: 'telegram_auth_failed',
            error: detail,
          },
          HttpStatus.UNAUTHORIZED,
        );
      }

      if (error instanceof TelegramChatNotFoundError) {
        throw new HttpException(
          {
            statusCode: HttpStatus.NOT_FOUND,
            message: 'Telegram briefing push failed',
            errorType: 'telegram_chat_not_found',
            error: detail,
          },
          HttpStatus.NOT_FOUND,
        );
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Telegram briefing push failed',
          errorType: 'transient',
          error: detail,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
