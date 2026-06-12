interface SectionProps {
  index: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function Section({ index, title, subtitle, children }: SectionProps) {
  return (
    <section className="border-t border-border py-14">
      <div className="mb-6 flex items-center gap-4">
        <span className="eyebrow text-accent whitespace-nowrap">
          [ {index} — {title} ]
        </span>
        <span className="h-px flex-1 bg-border" />
      </div>
      {subtitle && <p className="mb-6 max-w-xl text-sm text-muted">{subtitle}</p>}
      {children}
    </section>
  );
}
