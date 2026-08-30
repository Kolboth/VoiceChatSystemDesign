import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, useState, useRef, useEffect } from "react";

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "destructive";
type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-[var(--accent)] text-[var(--accent-fg)] hover:bg-[var(--accent-hover)] shadow-[inset_0_1px_rgba(255,255,255,0.18),0_0_18px_var(--terminal-glow)] disabled:opacity-50",
  secondary: "bg-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-3)] border border-[var(--border-subtle)]",
  ghost: "text-[var(--text-secondary)] hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]",
  outline: "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-2)]",
  destructive: "bg-[var(--danger)] text-white hover:opacity-90 disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: "h-6 px-2 text-xs gap-1 rounded-[var(--radius-xs)]",
  sm: "h-7 px-2.5 text-[13px] gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-8 px-3 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-9 px-4 text-sm gap-2 rounded-[var(--radius-md)]",
  icon: "h-8 w-8 rounded-[var(--radius-md)] justify-center",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", loading, leadingIcon, trailingIcon, children, className = "", disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`qp-interactive inline-flex items-center font-medium cursor-pointer select-none disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {loading ? <Spinner size={14} /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </button>
  )
);
Button.displayName = "Button";

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-spin shrink-0 ${className}`}
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leadingIcon?: ReactNode;
  trailingElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leadingIcon, trailingElement, className = "", id, ...props }, ref) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-[var(--text-secondary)]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leadingIcon && (
            <span className="absolute left-2.5 text-[var(--text-tertiary)] pointer-events-none">{leadingIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full h-8 bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] px-3 transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/25 ${leadingIcon ? "pl-8" : ""} ${trailingElement ? "pr-8" : ""} ${error ? "border-[var(--danger)]" : ""} ${className}`}
            {...props}
          />
          {trailingElement && (
            <span className="absolute right-2.5">{trailingElement}</span>
          )}
        </div>
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

// ─── Textarea ─────────────────────────────────────────────────────────────────

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? `ta-${Math.random().toString(36).slice(2)}`;
    return (
      <div className="flex flex-col gap-1.5">
        {label && <label htmlFor={inputId} className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          className={`w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] px-3 py-2 transition-colors focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/25 resize-none ${error ? "border-[var(--danger)]" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

// ─── Avatar ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = ["#6366f1","#14b8a6","#f59e0b","#ec4899","#3b82f6","#10b981","#8b5cf6","#f43f5e"];

function colorForId(id: string): string {
  let hash = 0;
  for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

interface AvatarProps {
  displayName: string;
  userId?: string;
  avatarUrl?: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const avatarSizes = { xs: "h-5 w-5 text-[10px]", sm: "h-7 w-7 text-xs", md: "h-8 w-8 text-sm", lg: "h-10 w-10 text-sm" };

export function Avatar({ displayName, userId = "", avatarUrl, size = "md", className = "" }: AvatarProps) {
  const initials = displayName.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  const bg = colorForId(userId || displayName);
  return (
    <div
      className={`rounded-[var(--radius-round)] shrink-0 flex items-center justify-center font-semibold text-white overflow-hidden ${avatarSizes[size]} ${className}`}
      style={{ background: avatarUrl ? undefined : bg }}
      aria-label={displayName}
    >
      {avatarUrl ? <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" /> : initials}
    </div>
  );
}

// ─── PresenceDot ──────────────────────────────────────────────────────────────

import type { Presence } from "../../types";

const presenceConfig: Record<Presence, { color: string; label: string }> = {
  online: { color: "#4ade80", label: "Online" },
  away: { color: "#fb923c", label: "Away" },
  dnd: { color: "#f87171", label: "Do not disturb" },
  offline: { color: "#5c6170", label: "Offline" },
};

export function PresenceDot({ presence, size = 8 }: { presence: Presence; size?: number }) {
  const config = presenceConfig[presence];
  return (
    <span
      className="rounded-full shrink-0 ring-2 ring-[var(--surface-1)]"
      style={{ width: size, height: size, background: config.color }}
      aria-label={config.label}
      title={config.label}
    />
  );
}

// ─── Switch ───────────────────────────────────────────────────────────────────

interface SwitchProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({ checked, onChange, label, description, disabled, id }: SwitchProps) {
  const switchId = id ?? `switch-${Math.random().toString(36).slice(2)}`;
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        id={switchId}
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-[var(--radius-round)] transition-colors duration-150 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--accent)] ${checked ? "bg-[var(--accent)]" : "bg-[var(--surface-3)] border border-[var(--border-strong)]"} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-150 ${checked ? "translate-x-4" : "translate-x-0"}`}
        />
      </button>
      {(label || description) && (
        <div>
          {label && <label htmlFor={switchId} className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">{label}</label>}
          {description && <p className="text-[13px] text-[var(--text-tertiary)] mt-0.5">{description}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Slider ───────────────────────────────────────────────────────────────────

interface SliderProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export function Slider({ value, onChange, min = 0, max = 100, step = 1, label, className = "" }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[13px] text-[var(--text-secondary)]">{label}</span>}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-1.5 appearance-none cursor-pointer rounded-full"
        style={{ background: `linear-gradient(to right, var(--accent) ${pct}%, var(--surface-3) ${pct}%)` }}
      />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectOption { value: string; label: string; }

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  label?: string;
  className?: string;
}

export function Select({ value, onChange, options, label, className = "" }: SelectProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && <span className="text-[13px] font-medium text-[var(--text-secondary)]">{label}</span>}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 w-full bg-[var(--surface-2)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] text-[13px] text-[var(--text-primary)] px-2.5 focus:outline-none focus:border-[var(--accent)] cursor-pointer"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

interface Tab { id: string; label: string; }

interface TabsProps {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = "" }: TabsProps) {
  return (
    <div role="tablist" className={`flex gap-0.5 p-0.5 bg-[var(--surface-2)] rounded-[var(--radius-md)] ${className}`}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 h-7 px-3 text-[13px] font-medium rounded-[var(--radius-sm)] transition-colors duration-100 ${active === tab.id ? "bg-[var(--surface-3)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Dialog ───────────────────────────────────────────────────────────────────

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  width?: string;
}

export function Dialog({ open, onClose, title, children, className = "", width = "max-w-md" }: DialogProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div className={`relative w-full ${width} bg-[var(--surface-2)] rounded-[var(--radius-xl)] border border-[var(--border-subtle)] shadow-2xl animate-fade-in ${className}`}>
        {title && (
          <div className="flex items-center justify-between px-5 pt-4 pb-0">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
            <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] p-1 rounded-[var(--radius-sm)] transition-colors" aria-label="Close dialog">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchor?: { top: number; left: number; } | null;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}

export function Popover({ open, onClose, anchor, children, className = "", align = "left" }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open || !anchor) return null;

  return (
    <div
      ref={ref}
      className={`fixed z-40 bg-[var(--surface-3)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] shadow-xl animate-fade-in overflow-hidden ${className}`}
      style={{
        top: anchor.top,
        ...(align === "left" ? { left: anchor.left } : { right: `calc(100vw - ${anchor.left}px)` }),
      }}
    >
      {children}
    </div>
  );
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

export function Tooltip({ children, label, side = "bottom" }: { children: ReactNode; label: string; side?: "top" | "bottom" | "left" | "right" }) {
  const [visible, setVisible] = useState(false);
  const posMap = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
    left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
    right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
  };
  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && (
        <div className={`absolute ${posMap[side]} z-50 px-2 py-1 rounded-[var(--radius-sm)] bg-[var(--surface-3)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)] whitespace-nowrap shadow-lg pointer-events-none`}>
          {label}
        </div>
      )}
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, icon, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center gap-3 py-12 px-6 ${className}`}>
      {icon && <div className="text-[var(--text-tertiary)]">{icon}</div>}
      <div>
        <p className="text-[15px] font-medium text-[var(--text-primary)]">{title}</p>
        {description && <p className="text-[13px] text-[var(--text-secondary)] mt-1 max-w-[280px]">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Separator ────────────────────────────────────────────────────────────────

export function Separator({ className = "" }: { className?: string }) {
  return <div className={`h-px bg-[var(--border-subtle)] ${className}`} role="separator" />;
}

// ─── AudioLevelMeter ──────────────────────────────────────────────────────────

export function AudioLevelMeter({ level = 0, className = "" }: { level?: number; className?: string }) {
  const bars = 12;
  const activeBars = Math.round((level / 100) * bars);
  return (
    <div className={`flex items-end gap-0.5 h-4 ${className}`} role="meter" aria-valuenow={level} aria-label="Input level">
      {Array.from({ length: bars }, (_, i) => (
        <div
          key={i}
          className="w-1 rounded-sm transition-all duration-75"
          style={{
            height: `${20 + (i / bars) * 80}%`,
            background: i < activeBars
              ? i > bars * 0.75 ? "var(--danger)" : i > bars * 0.5 ? "var(--warning)" : "var(--live)"
              : "var(--surface-3)",
          }}
        />
      ))}
    </div>
  );
}

// ─── ConnectionQualityIcon ────────────────────────────────────────────────────

import type { ConnectionQuality } from "../../types";

export function ConnectionQualityIcon({ quality }: { quality: ConnectionQuality }) {
  const bars = quality === "excellent" ? 3 : quality === "good" ? 2 : quality === "poor" ? 1 : 0;
  const color = quality === "excellent" ? "var(--success)" : quality === "good" ? "var(--info)" : quality === "poor" ? "var(--warning)" : "var(--text-tertiary)";
  return (
    <div className="flex items-end gap-0.5 h-3" title={quality}>
      {[1,2,3].map(i => (
        <div key={i} className="w-0.5 rounded-sm" style={{ height: `${33 * i}%`, background: i <= bars ? color : "var(--border-strong)" }} />
      ))}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, variant = "default" }: { children: ReactNode; variant?: "default" | "accent" | "success" | "warning" | "danger" }) {
  const colors = {
    default: "bg-[var(--surface-3)] text-[var(--text-secondary)]",
    accent: "bg-[var(--accent)] text-[var(--accent-fg)]",
    success: "bg-[var(--success)]/20 text-[var(--success)]",
    warning: "bg-[var(--warning)]/20 text-[var(--warning)]",
    danger: "bg-[var(--danger)]/20 text-[var(--danger)]",
  };
  return (
    <span className={`inline-flex items-center h-4 px-1.5 text-[11px] font-medium rounded-[var(--radius-xs)] ${colors[variant]}`}>
      {children}
    </span>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bg-[var(--surface-2)] rounded-[var(--radius-sm)] animate-pulse ${className}`} />;
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface MenuProps {
  items: MenuItem[];
  onSelect: (id: string) => void;
  className?: string;
}

export function Menu({ items, onSelect, className = "" }: MenuProps) {
  return (
    <div className={`py-1 min-w-[180px] ${className}`} role="menu">
      {items.map((item) => (
        item.separator
          ? <Separator key={item.id} className="my-1" />
          : (
            <button
              key={item.id}
              role="menuitem"
              disabled={item.disabled}
              onClick={() => onSelect(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] text-left transition-colors duration-75 disabled:opacity-40 disabled:cursor-not-allowed ${item.destructive ? "text-[var(--danger)] hover:bg-[var(--danger)]/10" : "text-[var(--text-primary)] hover:bg-[var(--surface-2)]"}`}
            >
              {item.icon && <span className="shrink-0 text-[var(--text-tertiary)]">{item.icon}</span>}
              {item.label}
            </button>
          )
      ))}
    </div>
  );
}

// ─── InlineError ──────────────────────────────────────────────────────────────

export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 text-[13px] text-[var(--danger)]">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {message}
    </div>
  );
}

// ─── ReconnectBanner ──────────────────────────────────────────────────────────

export function ReconnectBanner({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[var(--warning)]/10 border-b border-[var(--warning)]/20 text-[13px] text-[var(--warning)]">
      <div className="flex items-center gap-2">
        <Spinner size={12} className="text-[var(--warning)]" />
        <span>Reconnecting to voice…</span>
      </div>
      {onRetry && <Button variant="ghost" size="xs" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
