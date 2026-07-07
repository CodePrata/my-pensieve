import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { FreeTimeModule } from './free-time/free-time.module';
import { PrioritizationEngineService } from './prioritization-engine.service';

@Module({
  imports: [PrismaModule, FreeTimeModule],
  controllers: [BriefingController],
  providers: [BriefingService, PrioritizationEngineService],
})
export class BriefingModule {}
