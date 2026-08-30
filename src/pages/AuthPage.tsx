import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "../features/auth/auth-context";
import { Button, Input, InlineError } from "../components/ui/primitives";
import { APP_NAME } from "../types";

type AuthView = "sign-in" | "sign-up" | "forgot-password" | "forgot-sent" | "confirm-email";

export function AuthPage() {
  const { signIn, signUp, requestPasswordReset, error } = useAuth();
  const [view, setView] = useState<AuthView>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);

  const activeError = localError ?? error;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);
    try {
      if (view === "sign-in") {
        await signIn({ email, password, rememberMe });
      } else if (view === "sign-up") {
        if (!displayName.trim()) { setLocalError("Display name is required."); return; }
        if (!username.trim()) { setLocalError("Username is required."); return; }
        if (!/^[a-z0-9._-]{3,30}$/.test(username)) {
          setLocalError("Username must be 3–30 characters: lowercase letters, numbers, dots, hyphens.");
          return;
        }
        await signUp({ email, password, displayName: displayName.trim(), username: username.toLowerCase() });
      } else if (view === "forgot-password") {
        await requestPasswordReset(email);
        setView("forgot-sent");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "email_confirmation_required") setView("confirm-email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="qp-terminal-canvas flex h-full items-center justify-center px-5 py-8 qp-page-enter">
      <div className="w-full max-w-[390px]">
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/beo-beo-vc-icon.png" alt="" className="h-9 w-9 rounded-[var(--radius-md)] object-cover shadow-[0_0_22px_var(--terminal-glow)]" />
          <div>
            <p className="text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{APP_NAME}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">Voice with less friction.</p>
          </div>
        </div>

        {(view === "forgot-sent" || view === "confirm-email") ? (
          <div className="qp-panel-enter rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--surface-1)] p-5">
            <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--success)]/10 text-[var(--success)]"><Check size={16} /></div>
            <h1 className="text-[17px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">Check your email</h1>
            {view === "confirm-email" ? (
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--text-secondary)]">We sent a confirmation link to <strong className="font-medium text-[var(--text-primary)]">{email}</strong>. Open it to activate your account, then sign in.</p>
            ) : (
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--text-secondary)]">We sent a password reset link to {email}.</p>
            )}
            <Button variant="outline" size="sm" className="mt-5" onClick={() => setView("sign-in")}>Back to sign in</Button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <p className="qp-kicker mb-1.5">{view === "sign-in" ? "Welcome back" : view === "sign-up" ? "New account" : "Account recovery"}</p>
              <h1 className="text-[22px] font-semibold tracking-[-0.025em] text-[var(--text-primary)]">
                {view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Reset password"}
              </h1>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                {view === "sign-in" ? "Continue to your friends and voice rooms." : view === "sign-up" ? `Create your ${APP_NAME} profile.` : "We'll send a secure reset link to your email."}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
              {view === "sign-up" && (
                <>
                  <Input label="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" required autoFocus />
                  <Input label="Username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="your.username" required />
                </>
              )}
              <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus={view !== "sign-up"} />
              {view !== "forgot-password" && <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />}

              {view === "sign-in" && (
                <div className="flex items-center justify-between gap-3">
                  <label className="flex cursor-pointer select-none items-center gap-2">
                    <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} className="h-3.5 w-3.5 accent-[var(--accent)]" />
                    <span className="text-[12px] text-[var(--text-secondary)]">Remember me</span>
                  </label>
                  <button type="button" onClick={() => { setView("forgot-password"); setLocalError(null); }} className="text-[12px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Forgot password?</button>
                </div>
              )}

              {activeError && <InlineError message={activeError} />}

              <Button type="submit" variant="primary" size="md" loading={loading} className="mt-1 w-full justify-center">
                {view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Send reset link"}
              </Button>
            </form>

            <div className="mt-5 text-[12px]">
              {view === "sign-in" && <button onClick={() => { setView("sign-up"); setLocalError(null); }} className="text-[var(--accent)] hover:text-[var(--accent-hover)]">Create an account</button>}
              {view === "sign-up" && <button onClick={() => { setView("sign-in"); setLocalError(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Already have an account? Sign in</button>}
              {view === "forgot-password" && <button onClick={() => { setView("sign-in"); setLocalError(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">Back to sign in</button>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
