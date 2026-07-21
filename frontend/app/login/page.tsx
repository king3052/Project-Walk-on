"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const inputClass =
  "w-full bg-surface-panelHover border border-surface-border rounded-md px-3 py-2 text-fg focus:outline-none focus:border-accent";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;
        setNotice("Account created. If email confirmation is on, check your inbox — otherwise you're signed in.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image src="/logo-mascot.png" alt="" width={72} height={61} className="mx-auto mb-3" />
          <p className="text-xs tracking-wide text-accent mb-1">Project</p>
          <h1 className="font-display text-4xl tracking-tight text-fg">Walk-On</h1>
        </div>

        <div className="flex gap-1 mb-6 border-b border-surface-border">
          <button
            onClick={() => setMode("signin")}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              mode === "signin" ? "border-accent text-accent" : "border-transparent text-fg-dim"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`text-sm px-4 py-2 border-b-2 transition-colors ${
              mode === "signup" ? "border-accent text-accent" : "border-transparent text-fg-dim"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-xs tracking-wide text-fg-dim block mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          )}
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              required
            />
          </div>
          <div>
            <label className="text-xs tracking-wide text-fg-dim block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              minLength={6}
              required
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="w-full text-sm bg-accent hover:bg-accent-dim disabled:opacity-50 text-accent-deep px-5 py-2.5 rounded-md transition-colors"
          >
            {pending ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          {error && <p className="text-warn text-sm">{error}</p>}
          {notice && <p className="text-accent text-sm">{notice}</p>}
        </form>
      </div>
    </main>
  );
}
