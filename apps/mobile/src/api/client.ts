import { Platform } from "react-native";
import Constants from "expo-constants";
import type {
  WorkoutSheet,
  WorkoutSheetFull,
  Exercise,
  ExerciseSet,
  WorkoutSession,
  WorkoutSessionWithSheet,
  SessionDetailFull,
  CreateWorkoutSheetInput,
  UpdateWorkoutSheetInput,
  CreateExerciseInput,
  UpdateExerciseInput,
  CreateExerciseSetInput,
  UpdateExerciseSetInput,
  CreateWorkoutSessionInput,
  CreateSessionSetLogInput,
  SessionSetLog,
  ApiResponse,
} from "@bhmt3wp/shared";

// Detect the backend URL automatically:
// - On web: same hostname as the page, port 3000
// - On native: use the Expo dev server hostname (your PC's IP), port 3000
const getBaseUrl = () => {
  if (Platform.OS === "web") {
    // In the browser, use the same host
    const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
    return `http://${host}:3000`;
  }
  // On native (phone/emulator), Expo tells us the dev server IP
  const debuggerHost =
    Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoGo?.debuggerHost;
  if (debuggerHost) {
    const host = debuggerHost.split(":")[0];
    return `http://${host}:3000`;
  }
  // Fallback
  return "http://localhost:3000";
};

const BASE_URL = getBaseUrl();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...((options?.headers as Record<string, string>) || {}),
  };

  // Only set Content-Type for requests with a body
  if (options?.body) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// --- Sheets ---
export const api = {
  sheets: {
    list: () => request<ApiResponse<WorkoutSheet[]>>("/api/sheets").then((r) => r.data),
    get: (id: number) =>
      request<ApiResponse<WorkoutSheetFull>>(`/api/sheets/${id}`).then((r) => r.data),
    create: (data: CreateWorkoutSheetInput) =>
      request<ApiResponse<WorkoutSheet>>("/api/sheets", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    update: (id: number, data: UpdateWorkoutSheetInput) =>
      request<ApiResponse<WorkoutSheet>>(`/api/sheets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    delete: (id: number) => request<void>(`/api/sheets/${id}`, { method: "DELETE" }),
  },

  exercises: {
    listBySheet: (sheetId: number) =>
      request<ApiResponse<Exercise[]>>(`/api/sheets/${sheetId}/exercises`).then((r) => r.data),
    create: (data: CreateExerciseInput) =>
      request<ApiResponse<Exercise>>("/api/exercises", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    update: (id: number, data: UpdateExerciseInput) =>
      request<ApiResponse<Exercise>>(`/api/exercises/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    delete: (id: number) => request<void>(`/api/exercises/${id}`, { method: "DELETE" }),
  },

  sets: {
    listByExercise: (exerciseId: number) =>
      request<ApiResponse<ExerciseSet[]>>(`/api/exercises/${exerciseId}/sets`).then(
        (r) => r.data
      ),
    create: (data: CreateExerciseSetInput) =>
      request<ApiResponse<ExerciseSet>>("/api/sets", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    update: (id: number, data: UpdateExerciseSetInput) =>
      request<ApiResponse<ExerciseSet>>(`/api/sets/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    delete: (id: number) => request<void>(`/api/sets/${id}`, { method: "DELETE" }),
  },

  sessions: {
    list: () =>
      request<ApiResponse<WorkoutSession[]>>("/api/sessions").then((r) => r.data),
    completed: () =>
      request<ApiResponse<WorkoutSessionWithSheet[]>>("/api/sessions/completed").then((r) => r.data),
    get: (id: number) =>
      request<ApiResponse<SessionDetailFull>>(
        `/api/sessions/${id}`
      ).then((r) => r.data),
    create: (data: CreateWorkoutSessionInput) =>
      request<ApiResponse<WorkoutSession>>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    complete: (id: number) =>
      request<ApiResponse<WorkoutSession>>(`/api/sessions/${id}/complete`, {
        method: "PATCH",
      }).then((r) => r.data),
    delete: (id: number) => request<void>(`/api/sessions/${id}`, { method: "DELETE" }),
    logSet: (data: CreateSessionSetLogInput) =>
      request<ApiResponse<SessionSetLog>>("/api/session-logs", {
        method: "POST",
        body: JSON.stringify(data),
      }).then((r) => r.data),
    lastBySheet: (sheetId: number) =>
      request<ApiResponse<{ session: WorkoutSession; logs: SessionSetLog[] } | null>>(
        `/api/sessions/last-by-sheet/${sheetId}`
      ).then((r) => r.data),
  },
};
