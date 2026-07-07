import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;

  const prisma = {
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prismaRow = {
    id: 'proj-001',
    name: 'My Pensieve',
    repoUrl: 'https://github.com/example/my-pensieve',
    status: 'active',
    description: 'Personal knowledge and briefing dashboard.',
    importance: 'medium',
    dueDate: null,
    estimatedDurationMinutes: null,
    createdAt: new Date('2026-07-07T00:00:00.000Z'),
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(ProjectsService);
  });

  describe('getProjects', () => {
    it('returns mapped projects ordered by createdAt then id', async () => {
      prisma.project.findMany.mockResolvedValue([prismaRow]);

      const result = await service.getProjects();

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        {
          id: 'proj-001',
          name: 'My Pensieve',
          repoUrl: 'https://github.com/example/my-pensieve',
          status: 'active',
          description: 'Personal knowledge and briefing dashboard.',
          importance: 'medium',
          dueDate: null,
          estimatedDurationMinutes: null,
        },
      ]);
    });
  });

  describe('getProjectById', () => {
    it('returns mapped project when found', async () => {
      prisma.project.findUnique.mockResolvedValue(prismaRow);

      const result = await service.getProjectById('proj-001');

      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
      });
      expect(result).toEqual({
        id: 'proj-001',
        name: 'My Pensieve',
        repoUrl: 'https://github.com/example/my-pensieve',
        status: 'active',
        description: 'Personal knowledge and briefing dashboard.',
        importance: 'medium',
        dueDate: null,
        estimatedDurationMinutes: null,
      });
    });

    it('returns null when Prisma returns null', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      const result = await service.getProjectById('missing');

      expect(result).toBeNull();
    });
  });

  describe('createProject', () => {
    it('creates a project with the expected payload and returns mapped data', async () => {
      prisma.project.create.mockResolvedValue(prismaRow);

      const result = await service.createProject({
        name: 'My Pensieve',
        repoUrl: 'https://github.com/example/my-pensieve',
        status: 'active',
        description: 'Personal knowledge and briefing dashboard.',
      });

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'My Pensieve',
          repoUrl: 'https://github.com/example/my-pensieve',
          status: 'active',
          description: 'Personal knowledge and briefing dashboard.',
        },
      });
      expect(result.id).toBe('proj-001');
      expect(result.importance).toBe('medium');
      expect(result.dueDate).toBeNull();
      expect(result.estimatedDurationMinutes).toBeNull();
    });

    it('persists optional importance, dueDate, and estimatedDurationMinutes when provided', async () => {
      prisma.project.create.mockResolvedValue({
        ...prismaRow,
        importance: 'high',
        dueDate: new Date('2026-09-01T00:00:00.000Z'),
        estimatedDurationMinutes: 120,
      });

      const result = await service.createProject({
        name: 'My Pensieve',
        repoUrl: 'https://github.com/example/my-pensieve',
        status: 'active',
        importance: 'high',
        dueDate: '2026-09-01',
        estimatedDurationMinutes: 120,
      });

      expect(prisma.project.create).toHaveBeenCalledWith({
        data: {
          name: 'My Pensieve',
          repoUrl: 'https://github.com/example/my-pensieve',
          status: 'active',
          description: '',
          importance: 'high',
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
          estimatedDurationMinutes: 120,
        },
      });
      expect(result.importance).toBe('high');
      expect(result.dueDate).toBe('2026-09-01');
      expect(result.estimatedDurationMinutes).toBe(120);
    });
  });

  describe('updateProject', () => {
    it('updates importance when provided', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-001' });
      prisma.project.update.mockResolvedValue({
        ...prismaRow,
        importance: 'high',
      });

      const result = await service.updateProject('proj-001', {
        importance: 'high',
      });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
        data: { importance: 'high' },
      });
      expect(result.importance).toBe('high');
    });

    it('updates a project with the expected payload and returns mapped data', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-001' });
      prisma.project.update.mockResolvedValue({
        ...prismaRow,
        status: 'paused',
      });

      const result = await service.updateProject('proj-001', {
        status: 'paused',
      });

      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
        data: { status: 'paused' },
      });
      expect(result.status).toBe('paused');
    });

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProject('missing', { status: 'paused' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.project.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteProject', () => {
    it('deletes the project by id', async () => {
      prisma.project.findUnique.mockResolvedValue({ id: 'proj-001' });
      prisma.project.delete.mockResolvedValue(prismaRow);

      await service.deleteProject('proj-001');

      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: 'proj-001' },
      });
    });

    it('throws NotFoundException when project does not exist', async () => {
      prisma.project.findUnique.mockResolvedValue(null);

      await expect(service.deleteProject('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.project.delete).not.toHaveBeenCalled();
    });
  });
});
