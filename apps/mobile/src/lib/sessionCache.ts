import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedSessionState {
  completedSets: string[]; // serialized Set<string>
  editValues: Record<string, { kg: string; reps: string }>;
  notes: Record<string, string>;
  /**
   * Wall-clock instant, in ms, at which the running rest ends. Optional so
   * payloads written before this field existed still parse.
   */
  restEndsAt?: number | null;
  updatedAt: number;
}

const KEY = (id: string) => `session_cache_v1_${id}`;

export async function saveSessionState(
  id: string,
  state: SavedSessionState,
): Promise<void> {
  await AsyncStorage.setItem(KEY(id), JSON.stringify(state));
}

export async function loadSessionState(
  id: string,
): Promise<SavedSessionState | null> {
  const raw = await AsyncStorage.getItem(KEY(id));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Write the rest deadline on its own, without waiting for the debounced save
 * of the rest of the session state. A deadline that lands 300 ms late is
 * worthless if the app is backgrounded or killed in between, so this one field
 * is merged into the cached payload immediately.
 */
export async function saveRestEndsAt(id: string, restEndsAt: number | null): Promise<void> {
  const current = await loadSessionState(id);
  await saveSessionState(id, {
    completedSets: current?.completedSets ?? [],
    editValues: current?.editValues ?? {},
    notes: current?.notes ?? {},
    restEndsAt,
    updatedAt: Date.now(),
  });
}

export async function clearSessionState(id: string): Promise<void> {
  await AsyncStorage.removeItem(KEY(id));
}
