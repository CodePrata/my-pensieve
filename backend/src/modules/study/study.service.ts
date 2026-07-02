import { Injectable } from '@nestjs/common';

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
  getTopics(): StudyTopic[] {
    return [
      {
        id: 'topic-001',
        name: 'Cryptography basics',
        examName: 'CompTIA Security+',
        domain: '1.2',
        status: 'in_progress',
        deadline: '2026-08-15',
        notes: 'Review symmetric vs asymmetric encryption.',
      },
      {
        id: 'topic-002',
        name: 'Network security controls',
        examName: 'CompTIA Security+',
        domain: '3.2',
        status: 'not_started',
        deadline: null,
        notes: '',
      },
    ];
  }
}
