import { PriorityCandidate } from '../domain/priority-candidate.interface';
import { FreeTimeResult } from '../free-time/free-time.interface';
import {
  buildFallbackNarration,
  buildOllamaPrompt,
  deriveTimeOfDay,
  isContentAccurate,
  isWellFormedNarration,
} from './narration-template';

function study(id: string, title: string): PriorityCandidate {
  return {
    id,
    title,
    type: 'study_topic',
    dueDate: null,
    importance: 'medium',
    status: 'active',
    estimatedDurationMinutes: 60,
  };
}

function emptyFreeTime(totalFreeMinutes: number): FreeTimeResult {
  return {
    windows: [],
    totalFreeMinutes,
    largestWindowMinutes: totalFreeMinutes,
    windowCount: totalFreeMinutes > 0 ? 1 : 0,
  };
}

describe('buildOllamaPrompt', () => {
  const morning = new Date(2026, 6, 7, 9, 30);
  const candidates = [study('a', 'First'), study('b', 'Second')];
  const freeTimeResult = emptyFreeTime(120);

  it('includes rank-order instruction and correct JSON shape', () => {
    const prompt = buildOllamaPrompt(
      candidates,
      freeTimeResult,
      morning,
      'Alex',
    );

    expect(prompt).toContain(
      'candidates array is provided in priority rank order',
    );
    expect(prompt).toContain('candidates[0] as the top priority');
    expect(prompt).toContain('"timeOfDay": "Morning"');
    expect(prompt).toContain('"userName": "Alex"');
    expect(prompt).toContain('"candidates"');
    expect(prompt).toContain('"freeTimeResult"');
    expect(prompt).toContain('"formattedTotalFreeTime": "2 hours"');
    expect(prompt).not.toContain('"totalFreeMinutes"');
  });

  it.each([
    [0, '0 minutes'],
    [45, '45 minutes'],
    [60, '1 hour'],
    [369, '6 hours 9 minutes'],
    [720, '12 hours'],
  ])(
    'includes formatted free time (%i -> %s) instead of raw minutes in prompt JSON',
    (totalFreeMinutes, formatted) => {
      const prompt = buildOllamaPrompt(
        candidates,
        emptyFreeTime(totalFreeMinutes),
        morning,
        'Alex',
      );

      expect(prompt).toContain(`"formattedTotalFreeTime": "${formatted}"`);
      expect(prompt).not.toContain(`"totalFreeMinutes": ${totalFreeMinutes}`);
      expect(prompt).not.toMatch(/"totalFreeMinutes"\s*:/);
    },
  );

  it('places the focus-line instruction last, after input data', () => {
    const prompt = buildOllamaPrompt(
      candidates,
      freeTimeResult,
      morning,
      'Alex',
    );

    const inputDataIndex = prompt.indexOf('Input data:');
    const focusInstructionIndex = prompt.indexOf(
      'FINAL INSTRUCTION — Focus line',
    );
    expect(inputDataIndex).toBeGreaterThan(-1);
    expect(focusInstructionIndex).toBeGreaterThan(inputDataIndex);
    expect(prompt.trimEnd().endsWith('Now generate the briefing.')).toBe(true);
  });

  it('warns against generic focus lines when candidates are present', () => {
    const prompt = buildOllamaPrompt(
      candidates,
      freeTimeResult,
      morning,
      'Alex',
    );

    expect(prompt).toContain('The candidates list is NOT empty');
    expect(prompt).toContain(
      'Do NOT write a generic phrase like "Study and Projects"',
    );
    expect(prompt).toContain('Do NOT use the empty-candidates phrasing');
    expect(prompt).toContain('it is NOT empty here');
    expect(prompt).toContain('candidates[0].title is "First"');
    expect(prompt).toContain('Your primary focus should be on First.');
  });

  it('includes a worked example with a placeholder title', () => {
    const prompt = buildOllamaPrompt(
      candidates,
      freeTimeResult,
      morning,
      'Alex',
    );

    expect(prompt).toContain(
      'Worked example: If the top candidate\'s title is "Example Task Name", the last line must be exactly: "Your primary focus should be on Example Task Name."',
    );
  });

  it('uses empty-candidates focus instruction when no candidates exist', () => {
    const prompt = buildOllamaPrompt([], emptyFreeTime(0), morning, 'Alex');

    expect(prompt).toContain('The candidates list IS empty');
    expect(prompt).toContain(
      "Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet.",
    );
    expect(prompt).not.toContain('it is NOT empty here');
  });

  it('derives timeOfDay from the passed now parameter', () => {
    const afternoon = new Date(2026, 6, 7, 14, 0);
    const evening = new Date(2026, 6, 7, 19, 0);

    expect(deriveTimeOfDay(morning)).toBe('Morning');
    expect(deriveTimeOfDay(afternoon)).toBe('Afternoon');
    expect(deriveTimeOfDay(evening)).toBe('Evening');
    expect(
      buildOllamaPrompt([], emptyFreeTime(0), afternoon, 'Alex'),
    ).toContain('"timeOfDay": "Afternoon"');
  });
});

describe('isWellFormedNarration', () => {
  const valid = `Good Morning Alex,
Here's what you have today:
- Item one
You have 60 minutes of free time.
Your primary focus should be on Item one.`;

  it('returns true for a valid template match', () => {
    expect(isWellFormedNarration(valid)).toBe(true);
  });

  it('returns false when missing required markers', () => {
    expect(isWellFormedNarration('Good Morning Alex,\nNo briefing here.')).toBe(
      false,
    );
    expect(
      isWellFormedNarration(
        "Here's what you have today:\nYour primary focus should be on X.",
      ),
    ).toBe(false);
    expect(
      isWellFormedNarration(
        'Good Evening Alex,\nHere is what you have today:\nYour primary focus should be on X.',
      ),
    ).toBe(false);
  });

  it('returns false for conversational preamble', () => {
    expect(
      isWellFormedNarration(
        `Sure, here's your briefing:\nGood Morning Alex,\nHere's what you have today:\n- Item\nYou have 60 minutes of free time.\nYour primary focus should be on Item.`,
      ),
    ).toBe(false);
  });
});

describe('isContentAccurate', () => {
  const emptyCandidatesFocus =
    "Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet.";

  it('returns true when the top candidate title appears after the focus line', () => {
    const candidates = [study('top', 'Cryptography basics')];
    const text = `Good Morning Alex,
Here's what you have today:
- Cryptography basics
You have 60 minutes of free time.
Your primary focus should be on Cryptography basics.`;

    expect(isContentAccurate(text, candidates)).toBe(true);
  });

  it('returns false when a generic category name is used instead of the top candidate title', () => {
    const candidates = [study('top', 'Cryptography basics')];
    const text = `Good Evening there,
Here's what you have today:
- Nothing from Study or Projects yet — this section is still catching up.
You have 390 minutes of free time.
Your primary focus should be on Study and Projects.`;

    expect(isContentAccurate(text, candidates)).toBe(false);
  });

  it('returns true for the empty-candidates case with the exact expected fallback phrase', () => {
    const text = `Good Evening there,
Here's what you have today:
- Nothing from Study or Projects yet — this section is still catching up.
You have 390 minutes of free time.
${emptyCandidatesFocus}`;

    expect(isContentAccurate(text, [])).toBe(true);
  });

  it('returns false for the empty-candidates case if the fallback phrase is missing', () => {
    const text = `Good Evening there,
Here's what you have today:
- Nothing from Study or Projects yet — this section is still catching up.
You have 390 minutes of free time.
Your primary focus should be on Study and Projects.`;

    expect(isContentAccurate(text, [])).toBe(false);
  });
});

describe('buildFallbackNarration', () => {
  const now = new Date(2026, 6, 7, 10, 0);

  it('uses the empty-candidates placeholder bullet and focus line', () => {
    const narration = buildFallbackNarration(
      [],
      emptyFreeTime(90),
      now,
      'Alex',
    );

    expect(narration).toContain(
      '- Nothing from Study or Projects yet — this section is still catching up.',
    );
    expect(narration).toContain(
      "Your primary focus should be on getting Study and Projects data flowing — nothing's tracked there yet.",
    );
    expect(narration).not.toContain('Your primary focus should be on .');
  });

  it('uses zero free-time phrasing', () => {
    const narration = buildFallbackNarration([], emptyFreeTime(0), now, 'Alex');

    expect(narration).toContain("You don't have any free time today.");
    expect(narration).not.toContain('You have 0 minutes of free time.');
  });

  it.each([
    [45, 'You have 45 minutes of free time.'],
    [60, 'You have 1 hour of free time.'],
    [369, 'You have 6 hours 9 minutes of free time.'],
    [720, 'You have 12 hours of free time.'],
  ])(
    'formats %i minutes as human-readable free-time phrasing',
    (totalFreeMinutes, expectedLine) => {
      const narration = buildFallbackNarration(
        [],
        emptyFreeTime(totalFreeMinutes),
        now,
        'Alex',
      );

      expect(narration).toContain(expectedLine);
      if (totalFreeMinutes >= 60) {
        expect(narration).not.toContain(
          `You have ${totalFreeMinutes} minutes of free time.`,
        );
      }
    },
  );

  it('outputs only one bullet for a single candidate', () => {
    const narration = buildFallbackNarration(
      [study('only', 'Only item')],
      emptyFreeTime(60),
      now,
      'Alex',
    );

    const bulletLines = narration
      .split('\n')
      .filter((line) => line.startsWith('- '));
    expect(bulletLines).toEqual(['- Only item']);
  });

  it('caps bullets at three without re-sorting', () => {
    const candidates = [
      study('first', 'Top priority'),
      study('second', 'Second priority'),
      study('third', 'Third priority'),
      study('fourth', 'Fourth priority'),
    ];

    const narration = buildFallbackNarration(
      candidates,
      emptyFreeTime(60),
      now,
      'Alex',
    );

    const bulletLines = narration
      .split('\n')
      .filter((line) => line.startsWith('- '));
    expect(bulletLines).toEqual([
      '- Top priority',
      '- Second priority',
      '- Third priority',
    ]);
    expect(narration).toContain(
      'Your primary focus should be on Top priority.',
    );
    expect(narration).not.toContain('Fourth priority');
  });
});
