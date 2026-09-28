import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
  children: ReactNode;
  className?: string;
};

const V = {
  primary: "bg-primary text-white hover:bg-primary-fonce border-transparent",
  secondary: "bg-surface text-text border-rule hover:bg-sunk",
  ghost: "bg-transparent text-text-soft border-transparent hover:bg-sunk hover:text-text",
  danger: "bg-danger text-white border-transparent hover:opacity-90",
};

export function Button({ variant = "primary", size = "md", loading, disabled, children, className = "", type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${size === "sm" ? "h-7 px-2.5 text-[12px]" : "h-9 px-3.5 text-[13px]"} ${V[variant]} ${className}`}
      {...rest}
    >
      {loading && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  );
}
