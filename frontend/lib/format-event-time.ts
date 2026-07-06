import type { CalendarEvent } from "./types";

const dateOptions: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const timeOptions: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, dateOptions);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString(undefined, timeOptions);
}

export function formatEventSchedule(event: CalendarEvent): string {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);

  if (event.allDay) {
    const endInclusive = new Date(end);
    endInclusive.setUTCDate(endInclusive.getUTCDate() - 1);

    if (formatDate(start) === formatDate(endInclusive)) {
      return `All day · ${formatDate(start)}`;
    }

    return `All day · ${formatDate(start)} – ${formatDate(endInclusive)}`;
  }

  if (start.toDateString() === end.toDateString()) {
    return `${formatDate(start)} · ${formatTime(start)} – ${formatTime(end)}`;
  }

  return `${start.toLocaleString(undefined, { ...dateOptions, ...timeOptions })} – ${end.toLocaleString(undefined, { ...dateOptions, ...timeOptions })}`;
}
