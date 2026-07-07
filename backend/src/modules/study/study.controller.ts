import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateStudyTopicDto } from './dto/create-study-topic.dto';
import { UpdateStudyTopicDto } from './dto/update-study-topic.dto';
import { StudyService } from './study.service';

@Controller('study')
export class StudyController {
  constructor(private readonly studyService: StudyService) {}

  @Get('topics')
  getTopics() {
    return this.studyService.getTopics();
  }

  @Get('topics/:id')
  async getTopicById(@Param('id') id: string) {
    const topic = await this.studyService.getTopicById(id);
    if (!topic) {
      throw new NotFoundException(`Study topic ${id} not found`);
    }

    return topic;
  }

  @Post('topics')
  createTopic(@Body() body: CreateStudyTopicDto) {
    return this.studyService.createTopic(body);
  }

  @Patch('topics/:id')
  updateTopic(@Param('id') id: string, @Body() body: UpdateStudyTopicDto) {
    return this.studyService.updateTopic(id, body);
  }

  @Delete('topics/:id')
  async deleteTopic(@Param('id') id: string) {
    await this.studyService.deleteTopic(id);
  }
}
