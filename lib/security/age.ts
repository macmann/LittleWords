/** Age is a parent-provided snapshot; no birth date is inferred or required. */
export function currentAgeMonths(
  ageMonths: number | null,
  recordedAt: string | Date | null,
  now = new Date(),
): number | null {
  if (ageMonths === null || !recordedAt) return ageMonths;
  const date = new Date(recordedAt);
  let elapsed =
    (now.getUTCFullYear() - date.getUTCFullYear()) * 12 +
    now.getUTCMonth() -
    date.getUTCMonth();
  if (now.getUTCDate() < date.getUTCDate()) elapsed--;
  return ageMonths + Math.max(0, elapsed);
}
