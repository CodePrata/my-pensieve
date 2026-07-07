import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { FreeTimeModule } from './free-time/free-time.module';
import { BriefingNarrationService } from './narration/briefing-narration.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

@Module({
  imports: [PrismaModule, FreeTimeModule, ConfigModule.forRoot()],
  controllers: [BriefingController],
  providers: [
    BriefingService,
    PrioritizationEngineService,
    BriefingNarrationService,
  ],
})
export class BriefingModule {}
