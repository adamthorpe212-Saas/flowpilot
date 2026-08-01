/**
 * Shared state shape for the receptionist preview.
 *
 * Deliberately NOT in preview-actions.ts. A "use server" module may only export
 * async functions — Next.js turns every export into a server endpoint — so a
 * constant exported from one arrives in the browser as undefined. That is not a
 * build error and not a type error; it fails at runtime, on the first render,
 * with something as unhelpful as "cannot convert undefined to object".
 */

export type PreviewTurn = { role: "assistant" | "caller"; text: string };

export type PreviewState = {
  error: string | null;
  turns: PreviewTurn[];
  captured: Record<string, string>;
  complete: boolean;
};

export const EMPTY_PREVIEW: PreviewState = {
  error: null,
  turns: [],
  captured: {},
  complete: false,
};
