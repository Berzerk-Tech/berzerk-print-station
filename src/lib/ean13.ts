export function isEan13Format(s: string | null | undefined): boolean {
  if (!s) return false;
  return /^\d{13}$/.test(s.trim());
}
