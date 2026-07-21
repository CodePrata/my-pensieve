import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Post,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { WikiGeneratorService } from './wiki-generator.service';

@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly wikiGeneratorService: WikiGeneratorService,
  ) {}

  @Post('sync')
  async sync() {
    try {
      return await this.knowledgeService.syncRawItems();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown sync error';
      this.logger.error(`Knowledge Inbox sync failed: ${detail}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Knowledge Inbox sync failed',
          error: detail,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  @Get('inbox')
  getInbox() {
    return this.knowledgeService.getInbox();
  }

  @Post('process')
  async process() {
    try {
      return await this.wikiGeneratorService.processInbox();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown processing error';
      this.logger.error(`Knowledge Inbox processing failed: ${detail}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'Knowledge Inbox processing failed',
          error: detail,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
  }
}
