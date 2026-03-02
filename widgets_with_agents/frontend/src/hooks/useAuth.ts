import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/electronApi";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../types/database";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const done = () => {
      if (!cancelled) setLoading(false);
    };

    const sessionPromise = supabase.auth.getSession();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Auth timeout")), 12000)
    );

    Promise.race([sessionPromise, timeoutPromise])
      .then((result) => {
        if (cancelled) return;
        const { data: { session } } = result;
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id).then(setProfile);
        } else {
          setProfile(null);
        }
        done();
      })
      .catch(() => {
        // Lock timeout, Failed to fetch, or auth timeout: show login
        if (!cancelled) {
          setUser(null);
          setProfile(null);
          done();
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id).then(setProfile);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string): Promise<Profile | null> {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();
    return data as Profile | null;
  }

  const signUp = async (
    email: string,
    password: string,
    extra?: { name?: string; phone?: string; address?: string; account_no?: string; ifsc?: string }
  ) => {
    let res: Response;
    try {
      res = await apiFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, ...extra }),
      });
    } catch (e) {
      throw new Error(
        "Could not reach the server. Start the backend with: cd backend && npm run dev"
      );
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Sign-up failed");
    }
    await res.json();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
}
