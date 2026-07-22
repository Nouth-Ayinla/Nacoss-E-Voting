/**
 * Student Verification & Class List Matching Engine
 * Compares student submissions against official master class lists (100L - 500L).
 */

export interface ClassRosterItem {
  id?: string;
  matricNumber: string;
  name: string;
  level: number;
  department?: string;
  status?: string;
}

export interface VerificationComparisonResult {
  status: "MATCH" | "MISMATCH" | "NOT_FOUND";
  similarityScore: number; // 0 to 100
  masterRecord: ClassRosterItem | null;
  details?: string;
}

/**
 * Capitalizes the first letter of each name component (title-casing).
 * E.g., "john eze paul" -> "John Eze Paul"
 */
export function capitalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Normalizes a student's name for robust matching:
 * - Converts to lowercase
 * - Strips special symbols/punctuation
 * - Trims whitespace
 * - Sorts name tokens alphabetically (handles "First Last" vs "Last First")
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
  return cleaned.split(/\s+/).filter(Boolean).sort().join(" ");
}

/**
 * Computes Levenshtein Distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function calculateNameSimilarity(name1: string, name2: string): number {
  const norm1 = normalizeName(name1);
  const norm2 = normalizeName(name2);

  if (!norm1 && !norm2) return 100;
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 100;

  const tokens1 = norm1.split(" ");
  const tokens2 = norm2.split(" ");

  // 1. Calculate standard Levenshtein similarity on full sorted strings
  const maxLength = Math.max(norm1.length, norm2.length);
  const distance = levenshteinDistance(norm1, norm2);
  const standardSimilarity = Math.round(((maxLength - distance) / maxLength) * 100);

  // 2. Token Containment Check (handles "First Last" vs "First Middle Last")
  // Only apply if the shorter name has at least 2 tokens to avoid false positives (e.g. just matching "John")
  const shorter = tokens1.length < tokens2.length ? tokens1 : tokens2;
  const longer = tokens1.length < tokens2.length ? tokens2 : tokens1;

  if (shorter.length >= 2) {
    let exactMatches = 0;
    shorter.forEach(token => {
      if (longer.includes(token)) {
        exactMatches++;
      }
    });

    const containmentRatio = exactMatches / shorter.length;
    if (containmentRatio === 1) {
      // All tokens of the shorter name are present in the longer name (e.g., "John Doe" in "John Eze Doe")
      return 95;
    }
  }

  return Math.max(0, Math.min(100, standardSimilarity));
}

/**
 * Cross-references a submitted student against an array of class roster items.
 */
export function compareWithClassList(
  submittedMatric: string,
  submittedName: string,
  roster: ClassRosterItem[]
): VerificationComparisonResult {
  const cleanSubmittedMatric = submittedMatric.trim().toUpperCase();
  const matchedEntry = roster.find(
    (item) => item.matricNumber.trim().toUpperCase() === cleanSubmittedMatric
  );

  if (!matchedEntry) {
    return {
      status: "NOT_FOUND",
      similarityScore: 0,
      masterRecord: null,
      details: "Matriculation number not found in master class list.",
    };
  }

  const score = calculateNameSimilarity(submittedName, matchedEntry.name);

  if (score >= 90) {
    return {
      status: "MATCH",
      similarityScore: score,
      masterRecord: matchedEntry,
      details: "Name matches master class list entry.",
    };
  } else {
    return {
      status: "MISMATCH",
      similarityScore: score,
      masterRecord: matchedEntry,
      details: `Name mismatch (${score}% match). Master list has "${matchedEntry.name}".`,
    };
  }
}
