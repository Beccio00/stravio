/**
 * Import / Export utilities for workout sheets.
 *
 * Supported formats:
 *   Export → JSON, CSV, PDF
 *   Import → JSON, CSV
 *
 * Cross-platform strategy:
 *   Web    – JSON/CSV: Blob download via <a> tag  |  PDF: print window
 *   Native – JSON/CSV: expo-file-system + expo-sharing  |  PDF: expo-print
 */

import { Platform, Alert } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import type { WorkoutSheetFull } from "@bhmt3wp/shared";
import {
  IMPORT_PHASE_WEIGHTS,
  formatBytes,
  phaseRatio,
  type IOPhase,
  type IOProgress,
  type IOProgressFn,
} from "./ioProgress";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Nothing in this module is streamed or chunked: the whole file is read into a
 * string and parsed in one go. Past a few megabytes that is a memory spike and,
 * on device, a failure deep inside `readAsStringAsync`. Refuse it up front with
 * a message the user can act on instead.
 */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024;

/** Emit a parse tick roughly every 64 KB so large files actually animate. */
const PARSE_TICK_CHARS = 64 * 1024;

export interface ImportedSet {
  setNumber: number;
  reps: number;
  weightKg: number;
  restTimeSec: number;
}

export interface ImportedExercise {
  name: string;
  notes: string | null;
  sets: ImportedSet[];
}

export interface ImportedSheet {
  name: string;
  description: string | null;
  exercises: ImportedExercise[];
}

export interface ImportPayload {
  version: string;
  exportedAt: string;
  sheets: ImportedSheet[];
}

// ---------------------------------------------------------------------------
// Progress helpers
// ---------------------------------------------------------------------------

/** Emits an import-weighted tick. */
function emitImport(
  onProgress: IOProgressFn | undefined,
  phase: IOPhase,
  fraction: number,
  extra?: Omit<IOProgress, "phase" | "ratio">,
): void {
  onProgress?.({ phase, ratio: phaseRatio(IMPORT_PHASE_WEIGHTS, phase, fraction), ...extra });
}

function assertImportSize(bytes: number | undefined, filename: string): void {
  if (bytes === undefined || bytes <= MAX_IMPORT_BYTES) return;
  throw new Error(
    `"${filename}" is ${formatBytes(bytes)}, over the ${formatBytes(MAX_IMPORT_BYTES)} import limit. ` +
      `Split the export into smaller files and import them one at a time.`,
  );
}

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------

function csvCell(value: string | number | null | undefined): string {
  const s = String(value ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvRow(...cells: (string | number | null | undefined)[]): string {
  return cells.map(csvCell).join(",");
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

export function sheetsToJSON(sheets: WorkoutSheetFull[]): string {
  const payload: ImportPayload = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    sheets: sheets.map((s) => ({
      name: s.name,
      description: s.description,
      exercises: s.exercises.map((e) => ({
        name: e.name,
        notes: e.notes,
        sets: e.sets.map((set) => ({
          setNumber: set.setNumber,
          reps: set.reps,
          weightKg: set.weightKg,
          restTimeSec: set.restTimeSec,
        })),
      })),
    })),
  };
  return JSON.stringify(payload, null, 2);
}

// ---------------------------------------------------------------------------
// CSV Export
// ---------------------------------------------------------------------------

export function sheetsToCSV(sheets: WorkoutSheetFull[]): string {
  const lines: string[] = [
    csvRow(
      "sheet_name",
      "sheet_description",
      "exercise_name",
      "exercise_notes",
      "set_number",
      "reps",
      "weight_kg",
      "rest_time_sec",
    ),
  ];

  for (const sheet of sheets) {
    if (sheet.exercises.length === 0) {
      lines.push(csvRow(sheet.name, sheet.description, "", "", "", "", "", ""));
      continue;
    }
    for (const exercise of sheet.exercises) {
      if (exercise.sets.length === 0) {
        lines.push(
          csvRow(sheet.name, sheet.description, exercise.name, exercise.notes, "", "", "", ""),
        );
        continue;
      }
      for (const set of exercise.sets) {
        lines.push(
          csvRow(
            sheet.name,
            sheet.description,
            exercise.name,
            exercise.notes,
            set.setNumber,
            set.reps,
            set.weightKg,
            set.restTimeSec,
          ),
        );
      }
    }
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// PDF Export (HTML template)
// ---------------------------------------------------------------------------

/** Sheet, exercise and note text is user input: it must not be able to inject markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetsToHTML(sheets: WorkoutSheetFull[]): string {
  const sheetBlocks = sheets
    .map((sheet) => {
      const exerciseBlocks = sheet.exercises
        .map((ex) => {
          const rows = ex.sets
            .map(
              (set) =>
                `<tr>
              <td>${set.setNumber}</td>
              <td>${set.reps}</td>
              <td>${set.weightKg > 0 ? set.weightKg + " kg" : "—"}</td>
              <td>${set.restTimeSec > 0 ? set.restTimeSec + " s" : "—"}</td>
            </tr>`,
            )
            .join("");

          const notesRow = ex.notes
            ? `<p class="notes">📝 ${esc(ex.notes).replace(/\n/g, "<br/>")}</p>`
            : "";

          const setsTable =
            ex.sets.length > 0
              ? `<table>
              <thead>
                <tr><th>#</th><th>Reps</th><th>Weight</th><th>Rest</th></tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>`
              : "<p class='empty'>No sets defined.</p>";

          return `<div class="exercise">
            <h3>${esc(ex.name)}</h3>
            ${notesRow}
            ${setsTable}
          </div>`;
        })
        .join("");

      const descRow = sheet.description
        ? `<p class="sheet-desc">${esc(sheet.description)}</p>`
        : "";

      return `<div class="sheet">
          <h2>${esc(sheet.name)}</h2>
          ${descRow}
          ${sheet.exercises.length > 0 ? exerciseBlocks : '<p class="empty">No exercises.</p>'}
        </div>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Stravio – Workout Sheets</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           color: #111; background: #fff; padding: 32px; font-size: 13px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 32px; font-size: 12px; }
    .sheet { page-break-after: always; margin-bottom: 40px; }
    .sheet:last-child { page-break-after: auto; }
    h2 { font-size: 18px; border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 8px; }
    .sheet-desc { color: #555; margin-bottom: 16px; font-style: italic; }
    .exercise { margin-bottom: 20px; padding-left: 12px; border-left: 3px solid #3b82f6; }
    h3 { font-size: 14px; margin-bottom: 6px; }
    .notes { color: #555; font-size: 12px; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; background: #f1f5f9; padding: 6px 10px; border: 1px solid #ddd; }
    td { padding: 5px 10px; border: 1px solid #eee; }
    tr:nth-child(even) td { background: #f9fafb; }
    .empty { color: #999; font-style: italic; font-size: 12px; }
    @media print { body { padding: 16px; } }
  </style>
</head>
<body>
  <h1>Stravio – Workout Sheets</h1>
  <p class="meta">Exported on ${new Date().toLocaleDateString()}</p>
  ${sheetBlocks}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON Import parser
// ---------------------------------------------------------------------------

export function parseJSON(text: string, onProgress?: IOProgressFn): ImportedSheet[] {
  // `JSON.parse` is atomic — there is no way to subdivide it, so the phase gets
  // one tick on each side rather than a fake animation.
  emitImport(onProgress, "parsing", 0);

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  // Accept both the versioned wrapper and a raw array
  const raw: any[] = Array.isArray(parsed) ? parsed : parsed?.sheets;
  if (!Array.isArray(raw)) throw new Error("JSON must contain a 'sheets' array.");

  const sheets = raw.map((s: any, si: number) => {
    if (typeof s?.name !== "string" || !s.name.trim()) {
      throw new Error(`Sheet #${si + 1} is missing a name.`);
    }
    const exercises: ImportedExercise[] = Array.isArray(s.exercises)
      ? s.exercises.map((e: any, ei: number) => {
          if (typeof e?.name !== "string" || !e.name.trim()) {
            throw new Error(`Exercise #${ei + 1} in sheet "${s.name}" is missing a name.`);
          }
          const sets: ImportedSet[] = Array.isArray(e.sets)
            ? e.sets.map((set: any, si2: number) => ({
                setNumber: Number(set.setNumber ?? si2 + 1),
                reps: Number(set.reps ?? 0),
                weightKg: Number(set.weightKg ?? set.weight_kg ?? 0),
                restTimeSec: Number(set.restTimeSec ?? set.rest_time_sec ?? 0),
              }))
            : [];
          return { name: e.name.trim(), notes: e.notes ?? null, sets };
        })
      : [];
    return {
      name: s.name.trim(),
      description: s.description ?? null,
      exercises,
    };
  });

  emitImport(onProgress, "parsing", 1);
  return sheets;
}

// ---------------------------------------------------------------------------
// CSV Import parser
// ---------------------------------------------------------------------------

/**
 * Splits CSV text into rows of cells, honouring quoted cells that contain
 * commas, escaped quotes or line breaks (exercise notes often do).
 */
function parseCSVRows(text: string, onProgress?: IOProgressFn): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuote = false;
  let nextTick = PARSE_TICK_CHARS;

  for (let i = 0; i < text.length; i++) {
    // Progress only reads `i`; it must never touch the tokenizer state.
    if (onProgress && i >= nextTick) {
      nextTick = i + PARSE_TICK_CHARS;
      emitImport(onProgress, "parsing", i / text.length);
    }

    const ch = text[i];

    if (inQuote) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

export function parseCSV(text: string, onProgress?: IOProgressFn): ImportedSheet[] {
  emitImport(onProgress, "parsing", 0);
  const rows = parseCSVRows(text, onProgress);

  if (rows.length < 2) throw new Error("CSV file is empty or has only a header row.");

  // Detect header row and column indices
  const header = rows[0].map((h) => h.toLowerCase().trim());
  const col = (name: string) => header.indexOf(name);

  const iSheetName = col("sheet_name");
  const iSheetDesc = col("sheet_description");
  const iExName = col("exercise_name");
  const iExNotes = col("exercise_notes");
  const iSetNum = col("set_number");
  const iReps = col("reps");
  const iWeight = col("weight_kg");
  const iRest = col("rest_time_sec");

  if (iSheetName === -1) throw new Error("CSV is missing the 'sheet_name' column.");
  if (iExName === -1) throw new Error("CSV is missing the 'exercise_name' column.");

  const sheetsMap = new Map<string, ImportedSheet>();
  const sheetOrder: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i];
    const get = (idx: number) => (idx >= 0 ? (cells[idx] ?? "").trim() : "");

    const sheetName = get(iSheetName);
    if (!sheetName) continue;

    if (!sheetsMap.has(sheetName)) {
      sheetsMap.set(sheetName, {
        name: sheetName,
        description: get(iSheetDesc) || null,
        exercises: [],
      });
      sheetOrder.push(sheetName);
    }
    const sheet = sheetsMap.get(sheetName)!;

    const exName = get(iExName);
    if (!exName) continue;

    let exercise = sheet.exercises.find((e) => e.name === exName);
    if (!exercise) {
      exercise = { name: exName, notes: get(iExNotes) || null, sets: [] };
      sheet.exercises.push(exercise);
    }

    const setNum = parseInt(get(iSetNum), 10);
    if (Number.isNaN(setNum)) continue;

    exercise.sets.push({
      setNumber: setNum,
      reps: parseInt(get(iReps), 10) || 0,
      weightKg: parseFloat(get(iWeight)) || 0,
      restTimeSec: parseInt(get(iRest), 10) || 0,
    });
  }

  emitImport(onProgress, "parsing", 1);
  return sheetOrder.map((name) => sheetsMap.get(name)!);
}

// ---------------------------------------------------------------------------
// Platform-specific download / share helpers
// ---------------------------------------------------------------------------

async function shareOnNative(
  content: string,
  filename: string,
  mimeType: string,
): Promise<void> {
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert("Sharing not available", "Sharing is not supported on this device.");
    return;
  }
  await Sharing.shareAsync(path, { mimeType, dialogTitle: `Export ${filename}` });
}

function downloadOnWeb(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Public export functions
// ---------------------------------------------------------------------------

export async function exportJSON(sheets: WorkoutSheetFull[]): Promise<void> {
  const content = sheetsToJSON(sheets);
  const filename = `stravio-sheets-${dateSlug()}.json`;
  if (Platform.OS === "web") {
    downloadOnWeb(content, filename, "application/json");
  } else {
    await shareOnNative(content, filename, "application/json");
  }
}

export async function exportCSV(sheets: WorkoutSheetFull[]): Promise<void> {
  const content = sheetsToCSV(sheets);
  const filename = `stravio-sheets-${dateSlug()}.csv`;
  if (Platform.OS === "web") {
    downloadOnWeb(content, filename, "text/csv");
  } else {
    await shareOnNative(content, filename, "text/csv");
  }
}

export async function exportPDF(sheets: WorkoutSheetFull[]): Promise<void> {
  const html = sheetsToHTML(sheets);

  if (Platform.OS === "web") {
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
    return;
  }

  const Print = await import("expo-print");
  const { uri } = await Print.printToFileAsync({ html });

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    Alert.alert("Sharing not available", "Sharing is not supported on this device.");
    return;
  }
  const pdfFilename = `stravio-sheets-${dateSlug()}.pdf`;
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: pdfFilename });
}

// ---------------------------------------------------------------------------
// Public import function
// ---------------------------------------------------------------------------

export async function pickAndParseFile(
  onProgress?: IOProgressFn,
): Promise<ImportedSheet[] | null> {
  // The picker is the user's own time, so it reports 0% — the caller uses this
  // phase to keep the bar hidden until real work starts.
  emitImport(onProgress, "picking", 0, { message: "Choose a file…" });

  if (Platform.OS === "web") {
    return pickFileWeb(onProgress);
  }
  return pickFileNative(onProgress);
}

/** Routes a parsed file to the right parser, keeping the byte count attached. */
function parseByName(
  text: string,
  filename: string,
  bytes: number | undefined,
  onProgress?: IOProgressFn,
): ImportedSheet[] {
  // The parsers do not know the file size, so it is merged into every tick here.
  const withBytes: IOProgressFn | undefined = onProgress
    ? (p) => onProgress({ ...p, bytes: p.bytes ?? bytes })
    : undefined;

  return filename.toLowerCase().endsWith(".csv")
    ? parseCSV(text, withBytes)
    : parseJSON(text, withBytes);
}

function pickFileWeb(onProgress?: IOProgressFn): Promise<ImportedSheet[] | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,application/json,text/csv";

    // A file input only fires "change" when a file is chosen. Dismissing the OS
    // dialog used to leave this promise pending forever, so the Import row
    // stayed disabled until the screen remounted. "cancel" covers modern
    // browsers; the window "focus" fallback covers the rest.
    let settled = false;
    let picked = false;
    let graceTimer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      if (graceTimer !== undefined) clearTimeout(graceTimer);
      input.removeEventListener("change", onChange);
      input.removeEventListener("cancel", onCancel);
      window.removeEventListener("focus", onFocus);
    };
    const finish = (value: ImportedSheet[] | null) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const fail = (err: unknown) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const onChange = async () => {
      // Set synchronously so the focus fallback can never race this.
      picked = true;
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      try {
        assertImportSize(file.size, file.name);
        emitImport(onProgress, "reading", 0, {
          bytes: file.size,
          message: "Reading file…",
        });
        const text = await file.text();
        emitImport(onProgress, "reading", 1, { bytes: file.size });
        finish(parseByName(text, file.name, file.size, onProgress));
      } catch (err) {
        fail(err);
      }
    };

    const onCancel = () => {
      if (!picked) finish(null);
    };

    const onFocus = () => {
      // "change" normally lands first; give it a moment before giving up.
      graceTimer = setTimeout(() => {
        if (!picked) finish(null);
      }, 800);
    };

    input.addEventListener("change", onChange);
    input.addEventListener("cancel", onCancel);
    window.addEventListener("focus", onFocus, { once: true });
    input.click();
  });
}

async function pickFileNative(onProgress?: IOProgressFn): Promise<ImportedSheet[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/csv", "text/comma-separated-values", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  const name = asset.name ?? asset.uri;
  let bytes: number | undefined = asset.size ?? undefined;
  if (bytes === undefined) {
    try {
      const info = await FileSystem.getInfoAsync(asset.uri);
      if (info.exists && !info.isDirectory) bytes = info.size;
    } catch {
      // Unknown size: skip the guard and the label rather than block the import.
    }
  }
  assertImportSize(bytes, name);

  emitImport(onProgress, "reading", 0, { bytes, message: "Reading file…" });
  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  emitImport(onProgress, "reading", 1, { bytes });

  return parseByName(text, name, bytes, onProgress);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function dateSlug(): string {
  return new Date().toISOString().slice(0, 10);
}
