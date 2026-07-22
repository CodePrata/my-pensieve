import { Context } from 'telegraf';
import { createMessageRouter } from './messageRouter';
import { handleImage } from './imageHandler';
import { handleLink } from './linkHandler';
import { handleText } from './textHandler';

jest.mock('./imageHandler');
jest.mock('./linkHandler');
jest.mock('./textHandler');

const config = {
  vaultPath: '/vault',
  allowedUserId: 42,
  ollamaBaseUrl: 'http://localhost:11434',
  ollamaVisionModel: 'llava',
  videoEnrichment: {
    enabled: true,
    whisperEngine: 'whisper-cpp' as const,
    whisperCppBin: '/bin/whisper-cli',
    whisperModelPath: '/models/base.bin',
  },
};

function makeCtx(
  overrides: Partial<Context> & { message?: unknown; from?: { id: number } },
) {
  return {
    from: { id: 42 },
    reply: jest.fn(),
    ...overrides,
  } as unknown as Context;
}

describe('messageRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('silently ignores messages from a disallowed user', async () => {
    const router = createMessageRouter(config);
    const reply = jest.fn();
    const ctx = makeCtx({
      from: { id: 999 },
      message: { text: 'hello' },
      reply,
    });

    await router(ctx);

    expect(reply).not.toHaveBeenCalled();
    expect(jest.mocked(handleText)).not.toHaveBeenCalled();
    expect(jest.mocked(handleLink)).not.toHaveBeenCalled();
    expect(jest.mocked(handleImage)).not.toHaveBeenCalled();
  });

  it('routes photo messages to handleImage', async () => {
    const router = createMessageRouter(config);
    const ctx = makeCtx({ message: { photo: [{ file_id: 'abc' }] } });

    await router(ctx);

    expect(handleImage).toHaveBeenCalledWith(
      ctx,
      config.vaultPath,
      config.ollamaBaseUrl,
      config.ollamaVisionModel,
    );
  });

  it('routes text containing a URL to handleLink', async () => {
    const router = createMessageRouter(config);
    const ctx = makeCtx({
      message: { text: 'check this out https://github.com/foo/bar' },
    });

    await router(ctx);

    expect(handleLink).toHaveBeenCalledWith(
      ctx,
      'https://github.com/foo/bar',
      config.vaultPath,
      config.videoEnrichment,
    );
    expect(handleText).not.toHaveBeenCalled();
  });

  it('routes plain text without a URL to handleText', async () => {
    const router = createMessageRouter(config);
    const ctx = makeCtx({ message: { text: 'just a note' } });

    await router(ctx);

    expect(handleText).toHaveBeenCalledWith(ctx, config.vaultPath);
  });

  it('replies with an unsupported-type message for video/document/etc, writing nothing', async () => {
    const router = createMessageRouter(config);
    const reply = jest.fn();
    const ctx = makeCtx({ message: { video: { file_id: 'vid' } }, reply });

    await router(ctx);

    expect(reply).toHaveBeenCalledWith(
      expect.stringContaining("isn't supported"),
    );
    expect(jest.mocked(handleText)).not.toHaveBeenCalled();
    expect(jest.mocked(handleLink)).not.toHaveBeenCalled();
    expect(jest.mocked(handleImage)).not.toHaveBeenCalled();
  });
});
