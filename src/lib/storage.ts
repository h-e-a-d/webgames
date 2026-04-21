export function readList(key: string): string[] {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function writeList(key: string, values: string[]): void {
  localStorage.setItem(key, JSON.stringify(values));
}

export function addToList(key: string, value: string): void {
  const list = readList(key);
  if (list.includes(value)) return;
  list.push(value);
  writeList(key, list);
}

export function removeFromList(key: string, value: string): void {
  const list = readList(key);
  const next = list.filter((v) => v !== value);
  writeList(key, next);
}

export function isInList(key: string, value: string): boolean {
  return readList(key).includes(value);
}
