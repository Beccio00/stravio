/**
 * Progress model shared by the sheet import / export flows.
 *
 * Why the percentage is NOT byte based
 * ------------------------------------
 * A sheet serialises to ~5-7 KB of JSON; a heavy full export is 150-200 KB.
 * Parsing that costs a few milliseconds. The wait the user actually sees comes
 * from HTTP round-trips: `api.sheets.import()` issues `2 + S + 2E` strictly
 * sequential requests, so 20 sheets with 200 exercises is ~400 requests, tens
 * of seconds. A byte based bar would sit at 0% for the whole wait and then jump
 * to 100%.
 *
 * So the ratio tracks real work units (sheets fetched, exercises written) and
 * the byte count is carried alongside as a plain label.
 */

export type IOPhase =
  | "picking"
  | "reading"
  | "parsing"
  | "writing"
  | "sharing"
  | "done"
  | "error";

export interface IOProgress {
  phase: IOPhase;
  /** 0..1, already weighted across the phases of the whole operation. */
  ratio: number;
  /** Size of the file read or generated, when known. */
  bytes?: number;
  unit?: { done: number; total: number; label: string };
  message?: string;
}

export type IOProgressFn = (p: IOProgress) => void;

// ---------------------------------------------------------------------------
// Phase weights
// ---------------------------------------------------------------------------

export type PhaseWeights = Partial<Record<IOPhase, number>>;

/** The phases that consume time, in the order they happen. */
const PHASE_ORDER: IOPhase[] = ["picking", "reading", "parsing", "writing", "sharing"];

/**
 * Import: reading the file and parsing it are near-instant, writing the rows to
 * Supabase is a long sequence of round-trips. Weighted accordingly so the bar
 * spends its life where the user spends their time.
 */
export const IMPORT_PHASE_WEIGHTS: PhaseWeights = {
  reading: 0.04,
  parsing: 0.06,
  writing: 0.9,
};

/**
 * Export: "reading" is fetching every sheet from Supabase (one round-trip per
 * sheet, each doing 1 + 1 + N queries), "parsing" is serialising to JSON / CSV /
 * HTML, "writing" is the file write or blob download.
 */
export const EXPORT_PHASE_WEIGHTS: PhaseWeights = {
  reading: 0.85,
  parsing: 0.1,
  writing: 0.05,
};

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

/**
 * Turns (phase, fraction-completed-within-that-phase) into one overall ratio.
 *
 * `sharing` and `done` are always 1: the file already exists at that point, and
 * a full green bar must mean "the work is finished", not "you closed the share
 * sheet". For `error` the caller passes the ratio it had reached, which is
 * returned as-is so the bar turns red where it stopped.
 */
export function phaseRatio(weights: PhaseWeights, phase: IOPhase, fraction = 1): number {
  if (phase === "sharing" || phase === "done") return 1;
  if (phase === "error") return clamp01(fraction);
  if (phase === "picking") return 0;

  let before = 0;
  for (const p of PHASE_ORDER) {
    if (p === phase) break;
    before += weights[p] ?? 0;
  }
  return clamp01(before + (weights[phase] ?? 0) * clamp01(fraction));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** "812 B", "12.4 KB", "1.5 MB". */
export function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${Math.round(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
