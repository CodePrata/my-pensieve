export type WikiGenerationDecision =
  | { action: 'append'; title: string; summary: string | null }
  | { action: 'new'; title: string; summary: string };

export interface ProjectPromptContext {
  projectName: string;
  indexTitle: string;
}

export function buildWikiGenerationPrompt(
  existingTitles: string[],
  rawContent: string,
  projectContext?: ProjectPromptContext,
): string {
  const titleList =
    existingTitles.length > 0
      ? existingTitles.map((title) => `- ${title}`).join('\n')
      : '(none yet)';

  const projectHint = projectContext
    ? `\nThis note comes from the "${projectContext.projectName}" project repository. The main project overview page is titled "${projectContext.indexTitle}". Prefer appending to "${projectContext.indexTitle}" for general project updates; create a new page only for a distinct sub-topic or feature area.\n`
    : '';

  return `You are maintaining a personal knowledge wiki made of Markdown pages, one per concept/topic.
${projectHint}
Existing wiki page titles:
${titleList}

Given the captured note content below, decide whether it belongs on one of the existing pages, or whether it should become a new page.

Captured note content:
"""
${rawContent}
"""

Respond with ONLY minified JSON, no prose, no code fences, in exactly one of these two shapes:
{"action":"append","title":"<exact existing title from the list above>","summary":"<optional refreshed one-paragraph summary, or null to leave the existing summary unchanged>"}
{"action":"new","title":"<concise new page title>","summary":"<one-paragraph summary of the page>"}`;
}

export const SUMMARY_PENDING_FALLBACK = 'Summary pending processing.';

function normalizeOptionalSummary(summary: unknown): string | null {
  if (typeof summary !== 'string') {
    return null;
  }
  const trimmed = summary.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveRequiredSummary(summary: unknown, title: string): string {
  const normalized = normalizeOptionalSummary(summary);
  if (normalized !== null) {
    return normalized;
  }
  const trimmedTitle = title.trim();
  return trimmedTitle.length > 0 ? trimmedTitle : SUMMARY_PENDING_FALLBACK;
}

export function parseWikiGenerationResponse(
  raw: string,
): WikiGenerationDecision {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    throw new Error(`Ollama response was not valid JSON: ${raw}`);
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('action' in parsed) ||
    !('title' in parsed)
  ) {
    throw new Error(`Ollama response missing required fields: ${raw}`);
  }

  const { action, title, summary } = parsed as {
    action: unknown;
    title: unknown;
    summary?: unknown;
  };

  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new Error(`Ollama response has an invalid title: ${raw}`);
  }

  if (action === 'append') {
    return {
      action: 'append',
      title: title.trim(),
      summary: normalizeOptionalSummary(summary),
    };
  }

  if (action === 'new') {
    const trimmedTitle = title.trim();
    return {
      action: 'new',
      title: trimmedTitle,
      summary: resolveRequiredSummary(summary, trimmedTitle),
    };
  }

  throw new Error(`Ollama response has an unrecognized action: ${raw}`);
}
