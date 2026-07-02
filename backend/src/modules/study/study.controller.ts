import { Controller, Get } from '@nestjs/common';
import { StudyService } from './study.service';

@Controller('study')
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get('topics')
  getTopics() {
    return this.studyService.getTopics();
  }
}
