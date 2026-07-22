import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { GithubImportService } from './github-import.service';
import { KnowledgeService } from './knowledge.service';
import { WikiGeneratorService } from './wiki-generator.service';

@Controller('knowledge')
export class KnowledgeController {
  private readonly logger = new Logger(KnowledgeController.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly wikiGeneratorService: WikiGeneratorService,
    private readonly githubImportService: GithubImportService,
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
  getInbox(
    @Query('limit', new DefaultValuePipe(4), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.knowledgeService.getInbox(limit, offset);
  }

  @Post('sync-github')
  async syncGithub() {
    try {
      return await this.githubImportService.syncGithubSources();
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : 'Unknown GitHub sync error';
      this.logger.error(`GitHub Knowledge Inbox sync failed: ${detail}`);
      throw new HttpException(
        {
          statusCode: HttpStatus.BAD_GATEWAY,
          message: 'GitHub Knowledge Inbox sync failed',
          error: detail,
        },
        HttpStatus.BAD_GATEWAY,
      );
    }
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
