"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed.");
        setIsSubmitting(false);
        return;
      }

      router.push("/admin/dashboard");
    } catch {
      setError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-margin-mobile">
      <div className="w-full max-w-md bg-surface-container-lowest border border-outline-variant rounded shadow-sm overflow-hidden">
        <div className="p-stack-lg bg-surface-container-low border-b border-outline-variant text-center">
          <div className="w-12 h-12 flex items-center justify-center mx-auto mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="NACOSS FUTA Chapter Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="font-headline-md text-headline-md font-bold text-charcoal-slate">
            Admin Sign In
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">NACOSS FUTA Chapter E-Voting Portal</p>
        </div>

        <form className="p-stack-lg space-y-stack-md" onSubmit={handleLogin}>
          <div className="space-y-stack-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="email">
              Email
            </label>
            <input
              className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all"
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-stack-xs">
            <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                className="w-full h-12 pl-4 pr-12 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all"
                id="password"
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface flex items-center p-1 rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-[20px] select-none">
                  {showPassword ? "visibility" : "visibility_off"}
                </span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container rounded px-4 py-3 text-body-sm">{error}</div>
          )}

          <button
            className="w-full h-12 bg-primary-container text-white font-bold rounded-full hover:bg-primary transition-colors disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </main>
  );
}
