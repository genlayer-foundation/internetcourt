const STORAGE_KEY = "internetcourt:tracked-contracts";

export function getTrackedAddresses(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function addTrackedAddress(address: string): string[] {
  const current = getTrackedAddresses();
  const normalized = address.trim().toLowerCase();
  if (!normalized || current.includes(normalized)) return current;
  const updated = [...current, normalized];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function removeTrackedAddress(address: string): string[] {
  const current = getTrackedAddresses();
  const normalized = address.trim().toLowerCase();
  const updated = current.filter((a) => a !== normalized);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}
