// ============================================
// Shared types for the Stravio workout tracker
// ============================================

// --- User / Auth ---
export type UserRole = "coach" | "allievo";

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
}

// --- Workout Sheet (Scheda) ---
export interface WorkoutSheet {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkoutSheetInput {
  name: string;
  description?: string;
}

export interface UpdateWorkoutSheetInput {
  name?: string;
  description?: string;
}

// --- Exercise ---
export interface Exercise {
  id: string;
  sheetId: string;
  name: string;
  notes: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface CreateExerciseInput {
  sheetId: string;
  name: string;
  notes?: string;
  orderIndex?: number;
}

export interface UpdateExerciseInput {
  name?: string;
  notes?: string;
  orderIndex?: number;
}

// --- Exercise Set ---
export interface ExerciseSet {
  id: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  restTimeSec: number;
}

export interface CreateExerciseSetInput {
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  restTimeSec: number;
}

export interface UpdateExerciseSetInput {
  setNumber?: number;
  reps?: number;
  weightKg?: number;
  restTimeSec?: number;
}

// --- Workout Session (log of an actual workout) ---
export interface WorkoutSession {
  id: string;
  userId: string;
  sheetId: string;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
}

export interface CreateWorkoutSessionInput {
  sheetId: string;
  notes?: string;
}

// --- Session Set Log (actual performance per set) ---
export interface SessionSetLog {
  id: string;
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
  completedAt: string;
}

export interface CreateSessionSetLogInput {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weightKg: number;
}

export interface DeleteSessionSetLogInput {
  sessionId: string;
  exerciseId: string;
  setNumber: number;
}

// --- Session Exercise Note (notes for exercise during workout) ---
export interface SessionExerciseNote {
  id: string;
  sessionId: string;
  exerciseId: string;
  notes: string;
  updatedAt: string;
}

export interface UpsertSessionExerciseNoteInput {
  sessionId: string;
  exerciseId: string;
  notes: string;
}

// --- API Response wrappers ---
export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
}

// --- Full sheet with nested exercises and sets ---
export interface WorkoutSheetFull extends WorkoutSheet {
  exercises: ExerciseFull[];
}

export interface ExerciseFull extends Exercise {
  sets: ExerciseSet[];
}

// --- History types ---
export interface WorkoutSessionWithSheet extends WorkoutSession {
  sheetName: string;
}

export interface SessionExerciseGroup {
  exerciseId: string;
  exerciseName: string;
  sets: SessionSetLog[];
}

export interface SessionDetailFull extends WorkoutSession {
  sheetName: string;
  logs: SessionSetLog[];
  exercises: SessionExerciseGroup[];
}
