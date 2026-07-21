import { Injectable } from '@nestjs/common';

const OLLAMA_GENERATE_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'qwen2.5:7b-instruct';
const OLLAMA_TIMEOUT_MS = 15_000;

interface OllamaGenerateResponse {
  response: string;
}

@Injectable()
export class OllamaClientService {
  async generate(prompt: string): Promise<string> {
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
        throw new Error(`Ollama request failed: ${response.status} ${body}`);
      }

      const data = (await response.json()) as OllamaGenerateResponse;
      return data.response.trim();
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
