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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import type { WorkoutSheetFull } from "@bhmt3wp/shared";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
            ? `<p class="notes">📝 ${ex.notes.replace(/\n/g, "<br/>")}</p>`
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
            <h3>${ex.name}</h3>
            ${notesRow}
            ${setsTable}
          </div>`;
        })
        .join("");

      const descRow = sheet.description
        ? `<p class="sheet-desc">${sheet.description}</p>`
        : "";

      return `<div class="sheet">
          <h2>${sheet.name}</h2>
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

export function parseJSON(text: string): ImportedSheet[] {
  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON file.");
  }

  // Accept both the versioned wrapper and a raw array
  const raw: any[] = Array.isArray(parsed) ? parsed : parsed?.sheets;
  if (!Array.isArray(raw)) throw new Error("JSON must contain a 'sheets' array.");

  return raw.map((s: any, si: number) => {
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
}

// ---------------------------------------------------------------------------
// CSV Import parser
// ---------------------------------------------------------------------------

function parseCSVLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuote) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuote = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ",") {
      cells.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

export function parseCSV(text: string): ImportedSheet[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) throw new Error("CSV file is empty or has only a header row.");

  // Detect header row and column indices
  const header = parseCSVLine(lines[0]).map((h) => h.toLowerCase().trim());
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

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i]);
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

export async function pickAndParseFile(): Promise<ImportedSheet[] | null> {
  if (Platform.OS === "web") {
    return pickFileWeb();
  }
  return pickFileNative();
}

function pickFileWeb(): Promise<ImportedSheet[] | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,application/json,text/csv";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      try {
        const text = await file.text();
        const name = file.name.toLowerCase();
        if (name.endsWith(".csv")) {
          resolve(parseCSV(text));
        } else {
          resolve(parseJSON(text));
        }
      } catch (err) {
        reject(err);
      }
    };
    input.click();
  });
}

async function pickFileNative(): Promise<ImportedSheet[] | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/csv", "text/comma-separated-values", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.uri) return null;

  const text = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const name = (asset.name ?? asset.uri).toLowerCase();
  if (name.endsWith(".csv")) {
    return parseCSV(text);
  }
  return parseJSON(text);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function dateSlug(): string {
  return new Date().toISOString().slice(0, 10);
}
