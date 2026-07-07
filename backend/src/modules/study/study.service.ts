import { Injectable, NotFoundException } from '@nestjs/common';
import { StudyTopic as PrismaStudyTopic } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudyTopicDto } from './dto/create-study-topic.dto';
import { UpdateStudyTopicDto } from './dto/update-study-topic.dto';

export interface StudyTopic {
  id: string;
  name: string;
  examName: string;
  domain: string;
  status: 'not_started' | 'in_progress' | 'done';
  deadline: string | null;
  notes: string;
}

@Injectable()
export class StudyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists topics oldest-first by creation time; `id` breaks ties so seeded
   * topic-001 always precedes topic-002 when timestamps match.
   */
  async getTopics(): Promise<StudyTopic[]> {
    const rows = await this.prisma.studyTopic.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return rows.map(toStudyTopic);
  }

  async getTopicById(id: string): Promise<StudyTopic | null> {
    const row = await this.prisma.studyTopic.findUnique({ where: { id } });
    return row ? toStudyTopic(row) : null;
  }

  async createTopic(data: CreateStudyTopicDto): Promise<StudyTopic> {
    const row = await this.prisma.studyTopic.create({
      data: {
        name: data.name,
        examName: data.examName,
        domain: data.domain,
        status: data.status,
        deadline: parseDeadline(data.deadline),
        notes: data.notes ?? '',
      },
    });

    return toStudyTopic(row);
  }

  async updateTopic(
    id: string,
    data: UpdateStudyTopicDto,
  ): Promise<StudyTopic> {
    await this.ensureTopicExists(id);

    const row = await this.prisma.studyTopic.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.examName !== undefined ? { examName: data.examName } : {}),
        ...(data.domain !== undefined ? { domain: data.domain } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.deadline !== undefined
          ? { deadline: parseDeadline(data.deadline) }
          : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
      },
    });

    return toStudyTopic(row);
  }

  async deleteTopic(id: string): Promise<void> {
    await this.ensureTopicExists(id);
    await this.prisma.studyTopic.delete({ where: { id } });
  }

  private async ensureTopicExists(id: string): Promise<void> {
    const existing = await this.prisma.studyTopic.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Study topic ${id} not found`);
    }
  }
}

function toStudyTopic(row: PrismaStudyTopic): StudyTopic {
  return {
    id: row.id,
    name: row.name,
    examName: row.examName,
    domain: row.domain,
    status: row.status as StudyTopic['status'],
    deadline: row.deadline ? formatDateOnly(row.deadline) : null,
    notes: row.notes ?? '',
  };
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDeadline(value: string | null | undefined): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}
