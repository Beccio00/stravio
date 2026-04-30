import React, { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase, supabaseConfigError } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type UserRole = "coach" | "allievo";

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string | null;
}

interface AuthState {
  /** true while we're restoring the persisted session on app start */
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  configError: string | null;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // ------- Fetch user profile from Supabase -------
  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, role, display_name")
      .eq("id", userId)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
    }
  };

  // ------- Listen to auth state changes -------
  useEffect(() => {
    if (supabaseConfigError) {
      setLoading(false);
      setSession(null);
      setProfile(null);
      return;
    }

    // 1. Restore persisted session
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        if (s?.user) fetchProfile(s.user.id);
        setLoading(false);
      })
      .catch(() => {
        setSession(null);
        setProfile(null);
        setLoading(false);
      });

    // 2. Subscribe to future changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ------- Auth helpers -------
  const signIn = async (email: string, password: string) => {
    if (supabaseConfigError) {
      return { error: supabaseConfigError };
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (
    email: string,
    password: string,
    displayName?: string,
  ) => {
    if (supabaseConfigError) {
      return { error: supabaseConfigError };
    }
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role: "allievo", display_name: displayName ?? email },
      },
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        loading,
        session,
        user: session?.user ?? null,
        profile,
        configError: supabaseConfigError,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
