export const MORNING_END_HOUR = 12;
export const AFTERNOON_END_HOUR = 17;

export type TimeBlock = 'morning' | 'afternoon' | 'evening';

export function getTimeBlock(date: Date): TimeBlock {
  const hour = date.getHours();

  if (hour < MORNING_END_HOUR) {
    return 'morning';
  }

  if (hour < AFTERNOON_END_HOUR) {
    return 'afternoon';
  }

  return 'evening';
}
