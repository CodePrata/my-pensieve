import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { OllamaModule } from '../ollama/ollama.module';
import { GithubImportService } from './github-import.service';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';
import { VaultScannerService } from './vault-scanner.service';
import { VaultWriterService } from './vault-writer.service';
import { WikiGeneratorService } from './wiki-generator.service';

@Module({
  imports: [PrismaModule, OllamaModule, ConfigModule.forRoot()],
  controllers: [KnowledgeController],
  providers: [
    KnowledgeService,
    VaultScannerService,
    WikiGeneratorService,
    VaultWriterService,
    GithubImportService,
  ],
})
export class KnowledgeModule {}
