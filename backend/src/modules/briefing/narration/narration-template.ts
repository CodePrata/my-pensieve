import { PriorityCandidate } from '../domain/priority-candidate.interface';
import { formatFreeTime } from '../free-time/format-free-time.util';
import { FreeTimeResult } from '../free-time/free-time.interface';

const SYSTEM_PROMPT = `You are an elegant, minimal digital assistant built into a personal journal ecosystem. Your task is to process the provided JSON data and generate a daily briefing matching an exact structural layout.
Rules:
1. Address the user directly in the second person ("You").
2. Determine whether it is Morning, Afternoon, or Evening based on the provided timeOfDay value.
3. Follow the required layout structure EXACTLY. Do not add markdown headers (like # or ##), do not bold words, and do not add generic AI filler phrases at the start or end.
4. Output a maximum of 3 bullet points under the header line. The candidates array is provided in priority rank order — treat candidates[0] as the top priority. Do not re-rank. If no priority candidates exist, output exactly one bullet: "- Nothing from Study or Projects yet — this section is still catching up."
5. Keep bullet points short, factual, and strictly based on the provided data. Do not invent details.
6. If formattedTotalFreeTime is "0 minutes", write "You don't have any free time today." instead of "You have 0 minutes of free time."
7. If no priority candidates exist, write "Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet." instead of naming a top priority.

Required Layout Template:
Good [Morning/Afternoon/Evening] [User Name],
Here's what you have today:
- [bullet]
- [bullet]
You have [formattedTotalFreeTime] of free time.
Your primary focus should be on [top priority focus item name].`;

const EMPTY_CANDIDATES_BULLET =
  '- Nothing from Study or Projects yet — this section is still catching up.';

const EMPTY_CANDIDATES_FOCUS =
  "Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet.";

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening';

export function deriveTimeOfDay(now: Date): TimeOfDay {
  const hour = now.getHours();
  if (hour < 12) {
    return 'Morning';
  }
  if (hour < 17) {
    return 'Afternoon';
  }
  return 'Evening';
}

function buildFocusLineInstruction(candidates: PriorityCandidate[]): string {
  if (candidates.length === 0) {
    return `FINAL INSTRUCTION — Focus line (write this as the very last line of your output):
The candidates list IS empty. Use the empty-candidates focus phrasing exactly:
"Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet."
Now generate the briefing.`;
  }

  const topTitle = candidates[0].title;
  return `FINAL INSTRUCTION — Focus line (write this as the very last line of your output):
The candidates list is NOT empty (${candidates.length} candidates provided). Do NOT write a generic phrase like "Study and Projects" or a summary of the categories. Do NOT use the empty-candidates phrasing ("Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet.") unless the candidates list is genuinely empty — it is NOT empty here.
The last line must name candidates[0].title exactly. For this input, candidates[0].title is "${topTitle}".
Worked example: If the top candidate's title is "Example Task Name", the last line must be exactly: "Your primary focus should be on Example Task Name."
For this input, the last line must be exactly: "Your primary focus should be on ${topTitle}."
Now generate the briefing.`;
}

function buildPromptFreeTimeResult(freeTimeResult: FreeTimeResult) {
  const { totalFreeMinutes, ...rest } = freeTimeResult;

  return {
    ...rest,
    formattedTotalFreeTime: formatFreeTime(totalFreeMinutes),
  };
}

export function buildOllamaPrompt(
  candidates: PriorityCandidate[],
  freeTimeResult: FreeTimeResult,
  now: Date,
  userName: string,
): string {
  const timeOfDay = deriveTimeOfDay(now);
  const inputData = JSON.stringify(
    {
      candidates,
      freeTimeResult: buildPromptFreeTimeResult(freeTimeResult),
      timeOfDay,
      userName,
    },
    null,
    2,
  );

  return `${SYSTEM_PROMPT}\n\nInput data:\n${inputData}\n\n${buildFocusLineInstruction(candidates)}`;
}

export function isWellFormedNarration(text: string): boolean {
  return (
    text.startsWith('Good ') &&
    text.includes("Here's what you have today:") &&
    text.includes('Your primary focus should be on')
  );
}

const FOCUS_PREFIX = 'Your primary focus should be on';

export function isContentAccurate(
  text: string,
  candidates: PriorityCandidate[],
): boolean {
  if (candidates.length === 0) {
    return text.includes(EMPTY_CANDIDATES_FOCUS);
  }

  const focusIndex = text.indexOf(FOCUS_PREFIX);
  if (focusIndex === -1) {
    return false;
  }

  const afterFocus = text.slice(focusIndex + FOCUS_PREFIX.length);
  return afterFocus.includes(candidates[0].title);
}

export function buildFallbackNarration(
  candidates: PriorityCandidate[],
  freeTimeResult: FreeTimeResult,
  now: Date,
  userName: string,
): string {
  const timeOfDay = deriveTimeOfDay(now);
  const lines: string[] = [
    `Good ${timeOfDay} ${userName},`,
    "Here's what you have today:",
  ];

  if (candidates.length === 0) {
    lines.push(EMPTY_CANDIDATES_BULLET);
  } else {
    for (const candidate of candidates.slice(0, 3)) {
      lines.push(`- ${candidate.title}`);
    }
  }

  if (freeTimeResult.totalFreeMinutes === 0) {
    lines.push("You don't have any free time today.");
  } else {
    lines.push(
      `You have ${formatFreeTime(freeTimeResult.totalFreeMinutes)} of free time.`,
    );
  }

  if (candidates.length === 0) {
    lines.push(EMPTY_CANDIDATES_FOCUS);
  } else {
    lines.push(`Your primary focus should be on ${candidates[0].title}.`);
  }

  return lines.join('\n');
}
