import AsyncStorage from "@react-native-async-storage/async-storage";

export interface SavedSessionState {
  completedSets: string[]; // serialized Set<string>
  editValues: Record<string, { kg: string; reps: string }>;
  notes: Record<string, string>;
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

export async function clearSessionState(id: string): Promise<void> {
  await AsyncStorage.removeItem(KEY(id));
}
