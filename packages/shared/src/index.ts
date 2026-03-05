// ============================================
// Shared types for the gym workout tracker app
// ============================================

// --- Workout Sheet (Scheda) ---
export interface WorkoutSheet {
  id: number;
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
  id: number;
  sheetId: number;
  name: string;
  notes: string | null;
  orderIndex: number;
  createdAt: string;
}

export interface CreateExerciseInput {
  sheetId: number;
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
  id: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  restTimeSec: number;
}

export interface CreateExerciseSetInput {
  exerciseId: number;
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
  id: number;
  sheetId: number;
  startedAt: string;
  completedAt: string | null;
  notes: string | null;
}

export interface CreateWorkoutSessionInput {
  sheetId: number;
  notes?: string;
}

// --- Session Set Log (actual performance per set) ---
export interface SessionSetLog {
  id: number;
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weightKg: number;
  completedAt: string;
}

export interface CreateSessionSetLogInput {
  sessionId: number;
  exerciseId: number;
  setNumber: number;
  reps: number;
  weightKg: number;
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
  exerciseId: number;
  exerciseName: string;
  sets: SessionSetLog[];
}

export interface SessionDetailFull extends WorkoutSession {
  sheetName: string;
  logs: SessionSetLog[];
  exercises: SessionExerciseGroup[];
}
