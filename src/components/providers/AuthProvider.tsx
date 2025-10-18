"use client";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { AuthUser, getStoredUser, signIn, signOut } from "@/lib/auth";

type AuthContextValue = {
  user: AuthUser;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(getStoredUser());
    setLoading(false);
  }, []);

  async function handleSignIn(email: string, password: string) {
    const u = await signIn(email, password);
    setUser(u);
  }

  function handleSignOut() {
    signOut();
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, signIn: handleSignIn, signOut: handleSignOut }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}


