import type { Request, Response } from "express";
import { isSupabaseConfigured, supabaseAdmin } from "../config/supabase.js";
import { generateUID } from "../services/uidService.js";

export async function signUp(req: Request, res: Response): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    res.status(503).json({
      error: "Auth not available. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env (see Supabase Dashboard → Project Settings → API).",
    });
    return;
  }
  try {
    const { email, password, name, phone, address, account_no, ifsc } = req.body as {
      email: string;
      password: string;
      name?: string;
      phone?: string;
      address?: string;
      account_no?: string;
      ifsc?: string;
    };

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      res.status(400).json({ error: authError.message });
      return;
    }

    const userId = authData.user.id;

    // Get next sequence for UID (in production use DB sequence)
    const { count } = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true });
    const sequence = (count ?? 0) + 1;
    const uid = generateUID(sequence);

    const { error: profileError } = await supabaseAdmin.from("profiles").insert({
      user_id: userId,
      name: name ?? null,
      email: email ?? null,
      phone: phone ?? null,
      address: address ?? null,
      account_no: account_no ?? null,
      ifsc: ifsc ?? null,
      uid,
    });

    if (profileError) {
      res.status(500).json({ error: "Profile creation failed: " + profileError.message });
      return;
    }

    res.status(201).json({
      user: { id: userId, email: authData.user.email },
      uid,
      message: "Sign-up successful",
    });
  } catch (e) {
    console.error(e);
    const err = e as Error & { cause?: Error; code?: string };
    const isNetwork =
      err.message?.includes("fetch failed") ||
      err.code === "UND_ERR_CONNECT_TIMEOUT" ||
      err.cause?.message?.includes("Connect Timeout");
    res
      .status(isNetwork ? 503 : 500)
      .json({
        error: isNetwork
          ? "Could not reach Supabase. Check your internet connection and try again."
          : "Sign-up failed",
      });
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  if (!isSupabaseConfigured() || !supabaseAdmin) {
    res.status(503).json({
      error: "Profile not available. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to backend/.env.",
    });
    return;
  }
  try {
    const userId = req.headers["x-user-id"] as string | undefined;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      res.status(404).json({ error: "Profile not found" });
      return;
    }

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
}
