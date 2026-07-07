import { Injectable, NotFoundException } from '@nestjs/common';
import { Project as PrismaProject } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

export interface Project {
  id: string;
  name: string;
  repoUrl: string;
  status: 'active' | 'paused' | 'done';
  description: string;
  importance: 'low' | 'medium' | 'high';
  dueDate: string | null;
  estimatedDurationMinutes: number | null;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lists projects oldest-first by creation time; `id` breaks ties so seeded
   * proj-001 always precedes proj-002 when timestamps match.
   */
  async getProjects(): Promise<Project[]> {
    const rows = await this.prisma.project.findMany({
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return rows.map(toProject);
  }

  async getProjectById(id: string): Promise<Project | null> {
    const row = await this.prisma.project.findUnique({ where: { id } });
    return row ? toProject(row) : null;
  }

  async createProject(data: CreateProjectDto): Promise<Project> {
    const row = await this.prisma.project.create({
      data: {
        name: data.name,
        repoUrl: data.repoUrl,
        status: data.status,
        description: data.description ?? '',
        ...(data.importance !== undefined
          ? { importance: data.importance }
          : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: parseDateOnly(data.dueDate) }
          : {}),
        ...(data.estimatedDurationMinutes !== undefined
          ? { estimatedDurationMinutes: data.estimatedDurationMinutes }
          : {}),
      },
    });

    return toProject(row);
  }

  async updateProject(id: string, data: UpdateProjectDto): Promise<Project> {
    await this.ensureProjectExists(id);

    const row = await this.prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.repoUrl !== undefined ? { repoUrl: data.repoUrl } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.description !== undefined
          ? { description: data.description }
          : {}),
        ...(data.importance !== undefined
          ? { importance: data.importance }
          : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: parseDateOnly(data.dueDate) }
          : {}),
        ...(data.estimatedDurationMinutes !== undefined
          ? { estimatedDurationMinutes: data.estimatedDurationMinutes }
          : {}),
      },
    });

    return toProject(row);
  }

  async deleteProject(id: string): Promise<void> {
    await this.ensureProjectExists(id);
    await this.prisma.project.delete({ where: { id } });
  }

  private async ensureProjectExists(id: string): Promise<void> {
    const existing = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException(`Project ${id} not found`);
    }
  }
}

function toProject(row: PrismaProject): Project {
  return {
    id: row.id,
    name: row.name,
    repoUrl: row.repoUrl,
    status: row.status as Project['status'],
    description: row.description ?? '',
    importance: row.importance as Project['importance'],
    dueDate: row.dueDate ? formatDateOnly(row.dueDate) : null,
    estimatedDurationMinutes: row.estimatedDurationMinutes,
  };
}

function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function parseDateOnly(value: string | null | undefined): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}
