import { Injectable } from '@nestjs/common';
import { BriefingSnapshot } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../prisma/prisma.service';
import { getTimeBlock } from './time-block.util';

@Injectable()
export class SnapshotBlockCacheService {
  constructor(private readonly prisma: PrismaService) {}

  async findSnapshotForCurrentBlock(
    now: Date,
  ): Promise<BriefingSnapshot | null> {
    const snapshot = await this.prisma.briefingSnapshot.findFirst({
      where: {
        date: startOfDay(now),
      },
      orderBy: {
        generatedAt: 'desc',
      },
    });

    if (!snapshot) {
      return null;
    }

    if (getTimeBlock(snapshot.generatedAt) === getTimeBlock(now)) {
      return snapshot;
    }

    return null;
  }
}

function startOfDay(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
