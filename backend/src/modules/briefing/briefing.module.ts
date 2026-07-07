import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { PrioritizationEngineService } from './prioritization-engine.service';

@Module({
  imports: [PrismaModule],
  controllers: [BriefingController],
  providers: [BriefingService, PrioritizationEngineService],
})
export class BriefingModule {}
