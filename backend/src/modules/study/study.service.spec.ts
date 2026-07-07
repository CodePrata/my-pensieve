import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { StudyService } from './study.service';

describe('StudyService', () => {
  let service: StudyService;

  const prisma = {
    studyTopic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prismaRow = {
    id: 'topic-001',
    name: 'Cryptography basics',
    examName: 'CompTIA Security+',
    domain: '1.2',
    status: 'in_progress',
    deadline: new Date('2026-08-15T00:00:00.000Z'),
    notes: 'Review symmetric vs asymmetric encryption.',
    importance: 'medium',
    estimatedDurationMinutes: null,
    createdAt: new Date('2026-07-07T00:00:00.000Z'),
    updatedAt: new Date('2026-07-07T00:00:00.000Z'),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StudyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(StudyService);
  });

  describe('getTopics', () => {
    it('returns mapped topics ordered by createdAt then id', async () => {
      prisma.studyTopic.findMany.mockResolvedValue([prismaRow]);

      const result = await service.getTopics();

      expect(prisma.studyTopic.findMany).toHaveBeenCalledWith({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
      expect(result).toEqual([
        {
          id: 'topic-001',
          name: 'Cryptography basics',
          examName: 'CompTIA Security+',
          domain: '1.2',
          status: 'in_progress',
          deadline: '2026-08-15',
          notes: 'Review symmetric vs asymmetric encryption.',
          importance: 'medium',
          estimatedDurationMinutes: null,
        },
      ]);
    });
  });

  describe('getTopicById', () => {
    it('returns mapped topic when found', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue(prismaRow);

      const result = await service.getTopicById('topic-001');

      expect(prisma.studyTopic.findUnique).toHaveBeenCalledWith({
        where: { id: 'topic-001' },
      });
      expect(result).toEqual({
        id: 'topic-001',
        name: 'Cryptography basics',
        examName: 'CompTIA Security+',
        domain: '1.2',
        status: 'in_progress',
        deadline: '2026-08-15',
        notes: 'Review symmetric vs asymmetric encryption.',
        importance: 'medium',
        estimatedDurationMinutes: null,
      });
    });

    it('returns null when Prisma returns null', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue(null);

      const result = await service.getTopicById('missing');

      expect(result).toBeNull();
    });
  });

  describe('createTopic', () => {
    it('creates a topic with the expected payload and returns mapped data', async () => {
      prisma.studyTopic.create.mockResolvedValue(prismaRow);

      const result = await service.createTopic({
        name: 'Cryptography basics',
        examName: 'CompTIA Security+',
        domain: '1.2',
        status: 'in_progress',
        deadline: '2026-08-15',
        notes: 'Review symmetric vs asymmetric encryption.',
      });

      expect(prisma.studyTopic.create).toHaveBeenCalledWith({
        data: {
          name: 'Cryptography basics',
          examName: 'CompTIA Security+',
          domain: '1.2',
          status: 'in_progress',
          deadline: new Date('2026-08-15T00:00:00.000Z'),
          notes: 'Review symmetric vs asymmetric encryption.',
        },
      });
      expect(result.id).toBe('topic-001');
      expect(result.importance).toBe('medium');
      expect(result.estimatedDurationMinutes).toBeNull();
    });

    it('persists optional importance and estimatedDurationMinutes when provided', async () => {
      prisma.studyTopic.create.mockResolvedValue({
        ...prismaRow,
        importance: 'high',
        estimatedDurationMinutes: 90,
      });

      const result = await service.createTopic({
        name: 'Cryptography basics',
        examName: 'CompTIA Security+',
        domain: '1.2',
        status: 'in_progress',
        importance: 'high',
        estimatedDurationMinutes: 90,
      });

      expect(prisma.studyTopic.create).toHaveBeenCalledWith({
        data: {
          name: 'Cryptography basics',
          examName: 'CompTIA Security+',
          domain: '1.2',
          status: 'in_progress',
          deadline: null,
          notes: '',
          importance: 'high',
          estimatedDurationMinutes: 90,
        },
      });
      expect(result.importance).toBe('high');
      expect(result.estimatedDurationMinutes).toBe(90);
    });
  });

  describe('updateTopic', () => {
    it('updates importance when provided', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue({ id: 'topic-001' });
      prisma.studyTopic.update.mockResolvedValue({
        ...prismaRow,
        importance: 'high',
      });

      const result = await service.updateTopic('topic-001', {
        importance: 'high',
      });

      expect(prisma.studyTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-001' },
        data: { importance: 'high' },
      });
      expect(result.importance).toBe('high');
    });

    it('updates a topic with the expected payload and returns mapped data', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue({ id: 'topic-001' });
      prisma.studyTopic.update.mockResolvedValue({
        ...prismaRow,
        status: 'done',
      });

      const result = await service.updateTopic('topic-001', { status: 'done' });

      expect(prisma.studyTopic.update).toHaveBeenCalledWith({
        where: { id: 'topic-001' },
        data: { status: 'done' },
      });
      expect(result.status).toBe('done');
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTopic('missing', { status: 'done' }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.studyTopic.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteTopic', () => {
    it('deletes the topic by id', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue({ id: 'topic-001' });
      prisma.studyTopic.delete.mockResolvedValue(prismaRow);

      await service.deleteTopic('topic-001');

      expect(prisma.studyTopic.delete).toHaveBeenCalledWith({
        where: { id: 'topic-001' },
      });
    });

    it('throws NotFoundException when topic does not exist', async () => {
      prisma.studyTopic.findUnique.mockResolvedValue(null);

      await expect(service.deleteTopic('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.studyTopic.delete).not.toHaveBeenCalled();
    });
  });
});
