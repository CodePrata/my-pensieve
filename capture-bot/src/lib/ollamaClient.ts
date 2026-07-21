const CAPTION_PROMPT = 'Describe this image in 2-3 sentences, noting any visible text.';

export class OllamaCaptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OllamaCaptionError';
  }
}

export async function captionImage(
  imageBuffer: Buffer,
  model: string,
  baseUrl: string,
): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: CAPTION_PROMPT,
        images: [imageBuffer.toString('base64')],
        stream: false,
      }),
    });
  } catch (err) {
    throw new OllamaCaptionError(`Failed to reach Ollama at ${baseUrl}: ${(err as Error).message}`);
  }

  if (!response.ok) {
    throw new OllamaCaptionError(`Ollama returned ${response.status} ${response.statusText}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    throw new OllamaCaptionError(`Malformed Ollama response: ${(err as Error).message}`);
  }

  const responseText = (data as { response?: unknown })?.response;
  if (typeof responseText !== 'string' || responseText.length === 0) {
    throw new OllamaCaptionError('Ollama response missing "response" text field');
  }

  return responseText;
}
