import { useState } from "react";
import { useAuth } from "../features/auth/auth-context";
import { Button, Input, InlineError } from "../components/ui/primitives";
import { APP_NAME } from "../types";

type AuthView = "sign-in" | "sign-up" | "forgot-password" | "forgot-sent" | "confirm-email";

export function AuthPage() {
  const { signIn, signUp, requestPasswordReset, error, status } = useAuth();
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
      if (code === "email_confirmation_required") {
        setView("confirm-email");
      }
      // All other errors are set in context or localError
    } finally {
      setLoading(false);
    }
  }

  // Subtle voice room preview side panel
  const SidePanel = () => (
    <div className="hidden lg:flex flex-col justify-end w-80 shrink-0 bg-[var(--surface-1)] border-l border-[var(--border-subtle)] p-6 gap-3">
      <div className="mb-2">
        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-3">Design Lounge · Product Guild</p>
        {[
          { name: "Dara Osei", speaking: true },
          { name: "Mina Tahir", speaking: false },
          { name: "Alex Varga", muted: true },
        ].map(p => (
          <div key={p.name} className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-md)]">
            <div className={`relative w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${p.speaking ? "ring-2 ring-[var(--live)]" : ""}`}
              style={{ background: p.name === "Dara Osei" ? "#6366f1" : p.name === "Mina Tahir" ? "#14b8a6" : "#f59e0b" }}>
              {p.name.split(" ").map(n => n[0]).join("")}
            </div>
            <span className="text-[13px] text-[var(--text-secondary)]">{p.name}</span>
            {p.muted && <svg className="ml-auto text-[var(--text-tertiary)]" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/></svg>}
            {p.speaking && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[var(--live)] animate-pulse" />}
          </div>
        ))}
      </div>
      <p className="text-[12px] text-[var(--text-tertiary)]">Voice-first community chat. Fast, clear, always-on.</p>
    </div>
  );

  return (
    <div className="flex h-full bg-[var(--background)]">
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--accent)] flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
            </div>
            <span className="text-[17px] font-semibold text-[var(--text-primary)]">{APP_NAME}</span>
          </div>

          {(view === "forgot-sent" || view === "confirm-email") ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-full bg-[var(--success)]/15 flex items-center justify-center mx-auto mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5"/></svg>
              </div>
              <p className="text-[15px] font-semibold text-[var(--text-primary)] mb-2">Check your email</p>
              {view === "confirm-email" ? (
                <>
                  <p className="text-[13px] text-[var(--text-secondary)]">We sent a confirmation link to <strong>{email}</strong>.</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mt-1">Click it to activate your account, then sign in.</p>
                </>
              ) : (
                <p className="text-[13px] text-[var(--text-secondary)]">We sent a reset link to {email}.</p>
              )}
              <button onClick={() => setView("sign-in")} className="mt-6 text-[13px] text-[var(--accent)] hover:underline">Back to sign in</button>
            </div>
          ) : (
            <>
              <h1 className="text-[22px] font-semibold text-[var(--text-primary)] mb-1">
                {view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Reset password"}
              </h1>
              <p className="text-[13px] text-[var(--text-secondary)] mb-6">
                {view === "sign-in" ? "Welcome back." : view === "sign-up" ? `Join ${APP_NAME}.` : "Enter your email to receive a reset link."}
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {view === "sign-up" && (
                  <>
                    <Input label="Display name" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" required autoFocus />
                    <Input label="Username" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="your.username" required />
                  </>
                )}
                <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus={view !== "sign-up"} />
                {view !== "forgot-password" && (
                  <Input label="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
                )}

                {view === "sign-in" && (
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={e => setRememberMe(e.target.checked)}
                        className="w-3.5 h-3.5 rounded accent-[var(--accent)] cursor-pointer"
                      />
                      <span className="text-[13px] text-[var(--text-secondary)]">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setView("forgot-password"); setLocalError(null); }}
                      className="text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {activeError && <InlineError message={activeError} />}

                <Button type="submit" variant="primary" size="md" loading={loading} className="w-full justify-center mt-1">
                  {view === "sign-in" ? "Sign in" : view === "sign-up" ? "Create account" : "Send reset link"}
                </Button>
              </form>

              <div className="flex flex-col items-center gap-2 mt-6 text-[13px]">
                {view === "sign-in" && (
                  <button onClick={() => { setView("sign-up"); setLocalError(null); }} className="text-[var(--accent)] hover:underline">Create an account</button>
                )}
                {view === "sign-up" && (
                  <button onClick={() => { setView("sign-in"); setLocalError(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline">Already have an account? Sign in</button>
                )}
                {view === "forgot-password" && (
                  <button onClick={() => { setView("sign-in"); setLocalError(null); }} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:underline">Back to sign in</button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <SidePanel />
    </div>
  );
}
