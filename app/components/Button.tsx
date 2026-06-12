import Link from "next/link";

type Variant = "primary" | "secondary" | "link";
type Size = "sm" | "md";

// Shared: monospace, uppercase, letter-spaced, SHARP corners (matches reference design)
const base =
  "eyebrow group inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  // Solid fill that flips to accent on hover
  primary:
    "bg-foreground text-background hover:bg-accent hover:text-white",
  // Flat outline that fills on hover
  secondary:
    "border border-border bg-transparent text-foreground hover:border-accent hover:text-accent",
  // Plain text link with animated underline
  link: "link-underline text-muted hover:text-foreground !p-0",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2.5",
  md: "px-6 py-3.5",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: React.ReactNode;
};

function classes({ variant = "primary", size = "md", fullWidth, className }: Omit<CommonProps, "children">) {
  return [
    base,
    variants[variant],
    variant === "link" ? "" : sizes[size],
    fullWidth ? "w-full" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");
}

// Renders the label, auto-animating a trailing arrow if the text ends with one.
function Label({ children }: { children: React.ReactNode }) {
  if (typeof children === "string" && children.trimEnd().endsWith("→")) {
    const text = children.replace(/\s*→\s*$/, "");
    return (
      <>
        {text}
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </>
    );
  }
  return <>{children}</>;
}

export function Button({
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={classes({ variant, size, fullWidth, className })} {...rest}>
      <Label>{children}</Label>
    </button>
  );
}

export function LinkButton({
  href,
  variant,
  size,
  fullWidth,
  className,
  children,
  ...rest
}: CommonProps & { href: string } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const cls = classes({ variant, size, fullWidth, className });
  const isInternal = href.startsWith("/") && !rest.download;
  const label = <Label>{children}</Label>;

  if (isInternal) {
    return (
      <Link href={href} className={cls} {...rest}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} className={cls} {...rest}>
      {label}
    </a>
  );
}
