import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OllamaClientService } from '../../ollama/ollama-client.service';
import { PriorityCandidate } from '../domain/priority-candidate.interface';
import { FreeTimeResult } from '../free-time/free-time.interface';
import {
  buildFallbackNarration,
  buildOllamaPrompt,
  isContentAccurate,
  isWellFormedNarration,
} from './narration-template';

const MALFORMED_REASON = 'Narration output malformed — used fallback';
const INACCURATE_REASON = 'Narration content inaccurate — used fallback';
const UNAVAILABLE_REASON =
  'Narration unavailable — Ollama unreachable or timed out';

export interface NarrationResult {
  narration: string;
  degraded: boolean;
  degradedReason: string | null;
}

@Injectable()
export class BriefingNarrationService {
  private readonly logger = new Logger(BriefingNarrationService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly ollamaClient: OllamaClientService,
  ) {}

  async narrate(
    candidates: PriorityCandidate[],
    freeTimeResult: FreeTimeResult,
    now: Date,
  ): Promise<NarrationResult> {
    const userName = this.configService.get<string>('USER_FIRST_NAME') ?? 'there';
    const prompt = buildOllamaPrompt(
      candidates,
      freeTimeResult,
      now,
      userName,
    );

    try {
      const ollamaText = await this.ollamaClient.generate(prompt);
      if (!isWellFormedNarration(ollamaText)) {
        this.logger.warn('Ollama narration failed structural validation');
        return {
          narration: buildFallbackNarration(
            candidates,
            freeTimeResult,
            now,
            userName,
          ),
          degraded: true,
          degradedReason: MALFORMED_REASON,
        };
      }

      if (!isContentAccurate(ollamaText, candidates)) {
        this.logger.warn('Ollama narration failed content validation');
        return {
          narration: buildFallbackNarration(
            candidates,
            freeTimeResult,
            now,
            userName,
          ),
          degraded: true,
          degradedReason: INACCURATE_REASON,
        };
      }

      return {
        narration: ollamaText,
        degraded: false,
        degradedReason: null,
      };
    } catch (error) {
      this.logger.warn(
        `Ollama narration unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
      return {
        narration: buildFallbackNarration(
          candidates,
          freeTimeResult,
          now,
          userName,
        ),
        degraded: true,
        degradedReason: UNAVAILABLE_REASON,
      };
    }
  }
}
