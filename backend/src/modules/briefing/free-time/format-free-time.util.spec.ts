import { formatFreeTime } from './format-free-time.util';

describe('formatFreeTime', () => {
  it.each([
    [0, '0 minutes'],
    [45, '45 minutes'],
    [60, '1 hour'],
    [120, '2 hours'],
    [369, '6 hours 9 minutes'],
    [720, '12 hours'],
  ])('formats %i minutes as %s', (totalMinutes, expected) => {
    expect(formatFreeTime(totalMinutes)).toBe(expected);
  });

  it('uses singular units when appropriate', () => {
    expect(formatFreeTime(1)).toBe('1 minute');
    expect(formatFreeTime(61)).toBe('1 hour 1 minute');
  });
});
