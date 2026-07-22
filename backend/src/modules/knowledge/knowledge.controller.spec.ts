import { HttpException, HttpStatus } from '@nestjs/common';
import { GithubImportService } from './github-import.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { WikiGeneratorService } from './wiki-generator.service';

describe('KnowledgeController', () => {
  let controller: KnowledgeController;
  let knowledgeService: jest.Mocked<
    Pick<KnowledgeService, 'syncRawItems' | 'getInbox'>
  >;
  let wikiGeneratorService: jest.Mocked<
    Pick<WikiGeneratorService, 'processInbox'>
  >;

  beforeEach(() => {
    knowledgeService = {
      syncRawItems: jest.fn(),
      getInbox: jest.fn(),
    };
    wikiGeneratorService = {
      processInbox: jest.fn(),
    };

    controller = new KnowledgeController(
      knowledgeService as unknown as KnowledgeService,
      wikiGeneratorService as unknown as WikiGeneratorService,
      { syncGithubSources: jest.fn() } as unknown as GithubImportService,
    );
  });

  describe('POST /knowledge/sync', () => {
    it('returns the sync result on success', async () => {
      knowledgeService.syncRawItems.mockResolvedValue({
        created: 2,
        skipped: 1,
      });

      await expect(controller.sync()).resolves.toEqual({
        created: 2,
        skipped: 1,
      });
    });

    it('wraps a thrown error as a 502 HttpException', async () => {
      knowledgeService.syncRawItems.mockRejectedValue(
        new Error('OBSIDIAN_VAULT_PATH is not set'),
      );

      const error = (await controller
        .sync()
        .catch((caught: unknown) => caught)) as HttpException;

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Knowledge Inbox sync failed',
        error: 'OBSIDIAN_VAULT_PATH is not set',
      });
    });
  });

  describe('GET /knowledge/inbox', () => {
    it('delegates to the service with limit and offset query params', () => {
      knowledgeService.getInbox.mockReturnValue({
        items: [],
        totalCount: 0,
        unprocessedCount: 0,
        hasMore: false,
      } as never);

      void controller.getInbox(4, 8);

      expect(knowledgeService.getInbox).toHaveBeenCalledWith(4, 8);
    });

    it('returns unprocessedCount in the inbox response shape', () => {
      knowledgeService.getInbox.mockReturnValue({
        items: [],
        totalCount: 10,
        unprocessedCount: 3,
        hasMore: true,
      } as never);

      expect(controller.getInbox(4, 0)).toEqual({
        items: [],
        totalCount: 10,
        unprocessedCount: 3,
        hasMore: true,
      });
    });
  });

  describe('POST /knowledge/process', () => {
    it('returns the processing result, including partial failures, without throwing', async () => {
      wikiGeneratorService.processInbox.mockResolvedValue({
        processed: 1,
        failed: 1,
        failures: [{ rawItemId: 'raw-1', reason: 'Ollama unreachable' }],
      });

      await expect(controller.process()).resolves.toEqual({
        processed: 1,
        failed: 1,
        failures: [{ rawItemId: 'raw-1', reason: 'Ollama unreachable' }],
      });
    });

    it('wraps an unexpected processing error as a 502 HttpException', async () => {
      wikiGeneratorService.processInbox.mockRejectedValue(
        new Error('unexpected failure'),
      );

      const error = (await controller
        .process()
        .catch((caught: unknown) => caught)) as HttpException;

      expect(error).toBeInstanceOf(HttpException);
      expect(error.getStatus()).toBe(HttpStatus.BAD_GATEWAY);
      expect(error.getResponse()).toEqual({
        statusCode: HttpStatus.BAD_GATEWAY,
        message: 'Knowledge Inbox processing failed',
        error: 'unexpected failure',
      });
    });
  });
});
