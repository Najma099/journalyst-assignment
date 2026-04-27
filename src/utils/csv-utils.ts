import { parse } from "csv-parse/sync";

/**
 * Parses raw CSV text into an array of records (header row → key).
 * Returns an empty array for blank input.
 */
export function parseCsvRows(csvText: string): Record<string, string>[] {
  const trimmed = csvText.trim();
  if (!trimmed) return [];

  return parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true, // tolerate rows with fewer columns than headers
  }) as Record<string, string>[];
}

/**
 * Returns the header column names from raw CSV text without parsing all rows.
 */
export function extractHeaders(csvText: string): string[] {
  const firstLine = csvText.trim().split("\n")[0] ?? "";
  return firstLine.split(",").map((h) => h.trim());
}