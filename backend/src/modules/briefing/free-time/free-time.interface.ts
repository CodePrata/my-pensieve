export interface FreeWindow {
  start: Date;
  end: Date;
  durationMinutes: number;
}

export interface FreeTimeResult {
  windows: FreeWindow[];
  totalFreeMinutes: number;
  largestWindowMinutes: number;
  windowCount: number;
}
