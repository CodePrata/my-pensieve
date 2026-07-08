import { StudyTopic } from '../../../study/study.service';
import { mapStudyTopicToCandidate } from './study-candidate.mapper';

describe('mapStudyTopicToCandidate', () => {
  it('maps a normal study topic row', () => {
    const topic: StudyTopic = {
      id: 'topic-001',
      name: 'Cryptography basics',
      examName: 'CompTIA Security+',
      domain: '1.2',
      status: 'in_progress',
      deadline: '2026-08-15',
      notes: 'Review symmetric vs asymmetric encryption.',
      importance: 'high',
      estimatedDurationMinutes: 90,
    };

    expect(mapStudyTopicToCandidate(topic)).toEqual({
      type: 'study_topic',
      id: 'topic-001',
      title: 'Cryptography basics',
      dueDate: new Date('2026-08-15T00:00:00.000Z'),
      importance: 'high',
      status: 'in_progress',
      estimatedDurationMinutes: 90,
      examName: 'CompTIA Security+',
    });
  });

  it('maps a study topic with null deadline', () => {
    const topic: StudyTopic = {
      id: 'topic-002',
      name: 'Network security controls',
      examName: 'CompTIA Security+',
      domain: '3.2',
      status: 'not_started',
      deadline: null,
      notes: '',
      importance: 'medium',
      estimatedDurationMinutes: null,
    };

    expect(mapStudyTopicToCandidate(topic)).toEqual({
      type: 'study_topic',
      id: 'topic-002',
      title: 'Network security controls',
      dueDate: null,
      importance: 'medium',
      status: 'not_started',
      estimatedDurationMinutes: null,
      examName: 'CompTIA Security+',
    });
  });
});
