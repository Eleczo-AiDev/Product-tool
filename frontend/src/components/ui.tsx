import React from 'react';
import { AlertCircle, X } from 'lucide-react';

export const inputCls =
  'w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/50 focus:border-zinc-500 transition';

export function Badge({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${className || 'bg-zinc-800 text-zinc-300 border-zinc-700'}`}>{children}</span>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-xs bg-zinc-800 text-zinc-300 rounded px-1.5 py-0.5 border border-zinc-700/60">{children}</span>;
}

export function Field({ label, children, hint, error, required }: { label: React.ReactNode; required?: boolean; children: React.ReactNode; hint?: string; error?: string }) {
  return (
    <label className="block mb-3">
      <div className="text-sm font-medium text-zinc-300 mb-1">{label}{required && <span className="text-red-400"> *</span>}</div>
      {children}
      {hint && !error && <div className="text-xs text-zinc-500 mt-1">{hint}</div>}
      {error && (
        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
    </label>
  );
}

type BtnProps = {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'ghost' | 'outline' | 'danger' | 'dark';
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  disabled?: boolean;
};
export function Btn({ children, onClick, variant = 'primary', size = 'md', type = 'button', disabled }: BtnProps) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[.98]';
  const sizes = { sm: 'text-xs px-2.5 py-1.5', md: 'text-sm px-4 py-2' };
  const variants = {
    primary: 'bg-zinc-100 text-zinc-900 hover:bg-white',
    ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
    outline: 'border border-zinc-700 text-zinc-200 bg-transparent hover:bg-zinc-800 hover:border-zinc-600',
    danger: 'text-red-400 hover:bg-red-500/10',
    dark: 'bg-zinc-100 text-zinc-900 hover:bg-white',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${variants[variant]}`}>
      {children}
    </button>
  );
}

export function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className={`bg-zinc-900 rounded-xl shadow-2xl ring-1 ring-zinc-800 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'} my-8`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3.5">
          <h3 className="font-semibold text-zinc-100">{title}</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-100 rounded-lg p-1 hover:bg-zinc-800 transition">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="py-16 text-center text-zinc-500 text-sm">{label}</div>;
}

export function ErrorNote({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="py-4 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex items-center gap-2">
      <AlertCircle size={15} />
      {msg}
    </div>
  );
}
