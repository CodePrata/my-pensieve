import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProjectsModule } from '../projects/projects.module';
import { StudyModule } from '../study/study.module';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { CandidateAggregatorService } from './domain/candidate-aggregator.service';
import { FreeTimeModule } from './free-time/free-time.module';
import { BriefingNarrationService } from './narration/briefing-narration.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

@Module({
  imports: [
    PrismaModule,
    FreeTimeModule,
    StudyModule,
    ProjectsModule,
    ConfigModule.forRoot(),
  ],
  controllers: [BriefingController],
  providers: [
    BriefingService,
    CandidateAggregatorService,
    PrioritizationEngineService,
    BriefingNarrationService,
  ],
})
export class BriefingModule {}
