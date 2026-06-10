const KEY = "hanko_stamps";

export function saveStamp(base64: string): void {
  const existing = getStamps();
  existing.unshift({ id: Date.now().toString(), data: base64 });
  localStorage.setItem(KEY, JSON.stringify(existing));
}

export function getStamps(): { id: string; data: string }[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export function deleteStamp(id: string): void {
  const updated = getStamps().filter((s) => s.id !== id);
  localStorage.setItem(KEY, JSON.stringify(updated));
}