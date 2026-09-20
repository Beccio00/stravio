import { api } from "../api/client";

export const FREESTYLE_SHEET_NAME = "Freestyle";

export function isFreestyleSheetName(name: string | null | undefined): boolean {
  return (name ?? "").trim().toLocaleUpperCase("pl-PL") === FREESTYLE_SHEET_NAME.toLocaleUpperCase("pl-PL");
}

/** Jeden ukryty „plan” na użytkownika — trzyma ćwiczenia z sesji freestyle. */
export async function ensureFreestyleSheet(): Promise<{ sheetId: string }> {
  const sheets = await api.sheets.list();
  const existing = sheets.find((sheet) => isFreestyleSheetName(sheet.name));

  if (existing) {
    return { sheetId: existing.id };
  }

  const created = await api.sheets.create({
    name: FREESTYLE_SHEET_NAME,
    description: "Freestyle — wybieraj ćwiczenia w trakcie sesji.",
  });

  return { sheetId: created.id };
}
