import { Module } from '@nestjs/common';
import { BriefingModule } from './modules/briefing/briefing.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { StudyModule } from './modules/study/study.module';

@Module({
  imports: [
    CalendarModule,
    StudyModule,
    ProjectsModule,
    BriefingModule,
    KnowledgeModule,
  ],
})
export class AppModule {}
