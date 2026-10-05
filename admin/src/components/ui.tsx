import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

/** Composants d'interface du back-office, dans le style « Club » de l'app mobile. */

export function PageHeader({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="font-heading text-sm uppercase tracking-widest text-muted">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl">{title}</h1>
        <div className="mt-2 h-1.5 w-12 -skew-x-[20deg] bg-accent" />
      </div>
      {children}
    </header>
  );
}

type ButtonVariant = "primary" | "secondary" | "accent" | "danger";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "border-primary bg-primary text-on-primary hover:opacity-85",
  secondary: "border-foreground bg-transparent text-foreground hover:bg-surface",
  accent: "border-accent bg-accent text-on-accent hover:opacity-85",
  danger: "border-red-700 bg-transparent text-red-700 hover:bg-red-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-red-950",
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      className={`cursor-pointer border-2 px-4 py-2 font-heading text-sm uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40 ${buttonVariants[variant]} ${className}`}
      {...props}
    />
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`border-[1.5px] border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground focus:border-b-accent focus:border-b-[3px] ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`border-[1.5px] border-border bg-background px-3 py-2 text-foreground outline-none focus:border-foreground focus:border-b-accent focus:border-b-[3px] ${className}`}
      {...props}
    />
  );
}

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="font-heading text-xs uppercase tracking-widest">
      {children}
    </label>
  );
}

export function Card({ children, highlighted, className = "" }: { children: ReactNode; highlighted?: boolean; className?: string }) {
  return (
    <section className={`relative overflow-hidden bg-surface p-6 ${className}`}>
      {highlighted && (
        <div className="absolute top-0 right-0 h-0 w-0 border-t-[32px] border-l-[32px] border-t-accent border-l-transparent" />
      )}
      {children}
    </section>
  );
}

type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-border text-foreground",
  accent: "bg-accent text-on-accent",
  success: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  warning: "bg-yellow-100 text-yellow-900 dark:bg-yellow-950 dark:text-yellow-300",
  danger: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span className={`inline-block px-2 py-1 font-heading text-[11px] uppercase tracking-wider ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="bg-surface p-6 text-muted">{children}</p>;
}

export function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Paris" }).format(
    new Date(value)
  );
}
