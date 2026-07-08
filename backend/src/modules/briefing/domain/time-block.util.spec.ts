import {
  AFTERNOON_END_HOUR,
  getTimeBlock,
  MORNING_END_HOUR,
} from './time-block.util';

describe('getTimeBlock', () => {
  it('exports boundary constants for independent testing', () => {
    expect(MORNING_END_HOUR).toBe(12);
    expect(AFTERNOON_END_HOUR).toBe(17);
  });

  it('returns morning just before noon', () => {
    const date = atLocal(2026, 7, 8, 11, 59, 59, 999);

    expect(getTimeBlock(date)).toBe('morning');
  });

  it('returns afternoon exactly at noon', () => {
    const date = atLocal(2026, 7, 8, 12, 0, 0, 0);

    expect(getTimeBlock(date)).toBe('afternoon');
  });

  it('returns afternoon just before evening boundary', () => {
    const date = atLocal(2026, 7, 8, 16, 59, 59, 999);

    expect(getTimeBlock(date)).toBe('afternoon');
  });

  it('returns evening exactly at 17:00', () => {
    const date = atLocal(2026, 7, 8, 17, 0, 0, 0);

    expect(getTimeBlock(date)).toBe('evening');
  });

  it('returns evening late in the day', () => {
    const date = atLocal(2026, 7, 8, 22, 30, 0, 0);

    expect(getTimeBlock(date)).toBe('evening');
  });
});

function atLocal(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  ms = 0,
): Date {
  return new Date(year, month - 1, day, hour, minute, second, ms);
}
