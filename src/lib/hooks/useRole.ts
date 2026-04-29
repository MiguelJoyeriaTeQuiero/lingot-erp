"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type UserRole = "admin" | "contabilidad" | null;

export function useRole() {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (active) {
          setRole(null);
          setLoading(false);
        }
        return;
      }

      const result = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const data = result.data as { role: "admin" | "contabilidad" } | null;

      if (active) {
        setRole((data?.role as UserRole) ?? null);
        setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  return { role, loading };
}
