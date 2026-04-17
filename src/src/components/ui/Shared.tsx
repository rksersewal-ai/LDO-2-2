import React from "react";

export function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`glass-card ${className}`}>{children}</div>;
}

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "processing";
  className?: string;
}) {
  const variants = {
    default: "badge-default",
    success: "badge-success",
    warning: "badge-warning",
    danger: "badge-danger",
    processing: "badge-processing",
  };
  return (
    <span className={`badge-base ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
}) {
  const variants = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    ghost: "btn-ghost",
    danger: "btn-danger",
  };
  return (
    <button className={`btn-base ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`input-base ${className}`} {...props} />;
}
