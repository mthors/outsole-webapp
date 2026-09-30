import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function ComingSoon({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const { dict } = useI18n();
  return (
    <section className="shell py-24 md:py-32">
      <span className="rule-accent" />
      <p className="label-tech mt-6">{eyebrow}</p>
      <h1 className="display-lg mt-4 max-w-3xl">{title}</h1>
      <p className="mt-6 max-w-xl text-muted-foreground">{body}</p>
      <Link
        to="/"
        className="mt-10 inline-flex border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
      >
        {dict.common.goHome}
      </Link>
    </section>
  );
}
