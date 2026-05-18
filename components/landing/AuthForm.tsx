"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  const handleGoogleLogin = async () => {
    await fetch("/api/auth/clear", { method: "POST" }).catch(() => null);
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "register") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Registration failed");
          setLoading(false);
          return;
        }

        setSuccess("Account created! Logging you in...");
        // Auto-login after register
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Account created but login failed. Please try logging in.");
        } else {
          window.location.href = "/dashboard";
        }
      } else {
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });

        if (result?.error) {
          setError("Invalid email or password");
        } else {
          window.location.href = "/dashboard";
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
        Access the platform
      </p>
      <h3 className="font-display mt-2 text-xl font-semibold">
        {mode === "login" ? "Sign in to Jennabot" : "Create your account"}
      </h3>

      {/* Google button */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        className="btn-glow mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </button>

      <p className="mt-5 text-center text-[10px] font-semibold tracking-widest uppercase" style={{ color: "var(--text-4)" }}>
        or {mode === "login" ? "sign in" : "register"} with email
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {mode === "register" && (
          <div>
            <label htmlFor="auth-name" className="mb-2 block text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
              Name
            </label>
            <input
              id="auth-name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border px-4 text-sm outline-none transition"
              style={{
                borderColor: "var(--border)",
                background: "var(--input-bg)",
                color: "var(--fg)",
              }}
            />
          </div>
        )}
        <div>
          <label htmlFor="auth-email" className="mb-2 block text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            placeholder="hello@creator.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border px-4 text-sm outline-none transition"
            style={{
              borderColor: "var(--border)",
              background: "var(--input-bg)",
              color: "var(--fg)",
            }}
          />
        </div>
        <div>
          <label htmlFor="auth-password" className="mb-2 block text-[10px] font-medium uppercase tracking-widest" style={{ color: "var(--text-4)" }}>
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border px-4 text-sm outline-none transition"
            style={{
              borderColor: "var(--border)",
              background: "var(--input-bg)",
              color: "var(--fg)",
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center rounded-xl border text-sm font-semibold transition disabled:opacity-50"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            color: "var(--fg)",
          }}
        >
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm" style={{ color: "var(--text-3)" }}>
        {mode === "login" ? "Don't have an account? " : "Already have an account? "}
        <button
          type="button"
          onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); setSuccess(""); }}
          className="font-semibold underline underline-offset-2 transition"
          style={{ color: "var(--tag-text)" }}
        >
          {mode === "login" ? "Sign up" : "Log in"}
        </button>
      </p>
    </div>
  );
}
