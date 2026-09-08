export type RecipeStep = {
  label: string | null;
  body: string;
};

const NUMBER_MARKER = /^\s*\d+\s*[.、)）]\s*/;

function splitLabel(text: string): RecipeStep {
  // Steps are often written as "小标题：正文" — pull the short label out so it
  // can be rendered as a mini heading instead of running into the body text.
  const match = text.match(/^([^：:]{1,14}[：:])\s*([\s\S]*)$/);
  if (match) {
    return { label: match[1].replace(/[：:]$/, ''), body: match[2] };
  }
  return { label: null, body: text };
}

export function parseInstructionSteps(text: string | null | undefined): RecipeStep[] {
  const trimmed = (text ?? '').trim();
  if (!trimmed) return [];

  const lines = trimmed
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return lines.map((line) => splitLabel(line.replace(NUMBER_MARKER, '')));
  }

  // Single block of text — split right before each numbered marker that
  // follows sentence-ending punctuation, e.g. "...备用。2. 焯烫食材：...".
  const parts = trimmed
    .split(/(?<=[。！？.!?])\s*(?=\d+\s*[.、)）]\s*)/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.map((part) => splitLabel(part.replace(NUMBER_MARKER, '')));
  }

  return [splitLabel(trimmed)];
}
