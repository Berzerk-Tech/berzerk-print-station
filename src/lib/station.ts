const STORAGE_KEY = "berzerk_station_id";

export function getStationId(): string {
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}

export function getStationShortId(): string {
  return getStationId().slice(0, 8);
}
