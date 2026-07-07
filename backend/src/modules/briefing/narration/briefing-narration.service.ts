import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PriorityCandidate } from '../domain/priority-candidate.interface';
import { FreeTimeResult } from '../free-time/free-time.interface';
import {
  buildFallbackNarration,
  buildOllamaPrompt,
  isContentAccurate,
  isWellFormedNarration,
} from './narration-template';

const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'qwen2.5:7b-instruct';
const OLLAMA_TIMEOUT_MS = 15_000;

const MALFORMED_REASON = 'Narration output malformed — used fallback';
const INACCURATE_REASON = 'Narration content inaccurate — used fallback';
const UNAVAILABLE_REASON =
  'Narration unavailable — Ollama unreachable or timed out';

interface OllamaGenerateResponse {
  response: string;
}

export interface NarrationResult {
  narration: string;
  degraded: boolean;
  degradedReason: string | null;
}

@Injectable()
export class BriefingNarrationService {
  private readonly logger = new Logger(BriefingNarrationService.name);

  constructor(private readonly configService: ConfigService) {}

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
      const ollamaText = await this.callOllama(prompt);
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

  private async callOllama(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

    try {
      const response = await fetch(OLLAMA_GENERATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(
          `Ollama request failed: ${response.status} ${body}`,
        );
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response.trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
