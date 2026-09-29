import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFirstAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/login")({
  /**
   * If a valid session already exists with admin role, skip login.
   * We rely on the client session here because we cannot forward localStorage
   * tokens inside a server loader without a cookie; redirect happens client-side
   * in the component useEffect instead for session-resumption.
   */
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError || !data.session) {
        setError(signInError?.message ?? "Sign-in failed. Check your credentials.");
        return;
      }

      // Set session cookie so server functions and SSR can authenticate
      if (typeof document !== "undefined") {
        document.cookie = `sb-access-token=${data.session.access_token}; path=/; max-age=604800; SameSite=Lax`;
      }

      // Attempt bootstrap (no-op if any admin already exists).
      try {
        await bootstrapFirstAdmin();
      } catch {
        // Non-fatal: if bootstrap fails the user may already be admin.
      }

      // Verify the user actually has admin role before redirecting.
      const { count } = await supabase
        .from("user_roles")
        .select("id", { count: "exact", head: true })
        .eq("user_id", data.session.user.id)
        .eq("role", "admin");

      if ((count ?? 0) === 0) {
        await supabase.auth.signOut();
        setError("Your account does not have admin access.");
        return;
      }

      navigate({ to: "/admin" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-logo-mark">ODE</span>
          <h1 className="admin-login-title">Admin Sign In</h1>
          <p className="admin-login-subtitle">ODE Outsole · Management Portal</p>
        </div>

        <form id="admin-login-form" className="admin-login-form" onSubmit={handleSubmit} noValidate>
          <div className="admin-field">
            <label htmlFor="admin-email" className="admin-field-label">
              Email address
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              className="admin-field-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
            />
          </div>

          <div className="admin-field">
            <label htmlFor="admin-password" className="admin-field-label">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              className="admin-field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {error && (
            <div id="admin-login-error" className="admin-login-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <button
            id="admin-login-submit"
            type="submit"
            className="admin-login-submit"
            disabled={loading}
          >
            {loading ? (
              <span className="admin-login-spinner" aria-label="Signing in…" />
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
