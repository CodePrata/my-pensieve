import { StudyTopic } from '../../../study/study.service';
import { StudyCandidate } from '../priority-candidate.interface';

export function mapStudyTopicToCandidate(topic: StudyTopic): StudyCandidate {
  return {
    type: 'study_topic',
    id: topic.id,
    title: topic.name,
    dueDate: parseDateOnly(topic.deadline),
    importance: topic.importance,
    status: topic.status,
    estimatedDurationMinutes: topic.estimatedDurationMinutes,
    examName: topic.examName,
  };
}

function parseDateOnly(value: string | null): Date | null {
  if (value === null || value === '') {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}
