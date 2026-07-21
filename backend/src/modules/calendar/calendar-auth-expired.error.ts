export class CalendarAuthExpiredError extends Error {
  constructor(message = 'Google Calendar authorization expired or revoked') {
    super(message);
    this.name = 'CalendarAuthExpiredError';
  }
}
