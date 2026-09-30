import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { getOutsole, getInteriorHero } from "@/lib/public-catalog.functions";
import { submitInquiry } from "@/lib/inquiries.functions";
import type { InquiryInput } from "@/lib/inquiries.functions";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { InteriorHero } from "@/components/site/InteriorHero";
import { useI18n } from "@/lib/i18n";
import { z } from "zod";

const interiorHeroQuery = queryOptions({
  queryKey: ["interior-hero"],
  queryFn: () => getInteriorHero(),
  staleTime: 5 * 60 * 1000,
  refetchOnMount: false,
});

export const Route = createFileRoute("/request-sample")({
  validateSearch: (search: Record<string, unknown>): { product?: string } => {
    const p = search["product"];
    return typeof p === "string" && p.trim() ? { product: p.trim().slice(0, 150) } : {};
  },
  loaderDeps: ({ search }) => ({ product: search.product }),
  loader: async ({ deps, context }) => {
    await context.queryClient.ensureQueryData(interiorHeroQuery);
    if (!deps.product) return { selected: null };
    try {
      const res = await getOutsole({ data: { slug: deps.product } });
      const o = res.outsole;
      return { selected: o ? { id: o.id, name: o.name, model: o.model_number } : null };
    } catch {
      return { selected: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Request a Sample — ODE Outsole" },
      { name: "description", content: "Request outsole samples for your footwear program." },
      { property: "og:title", content: "Request a Sample — ODE Outsole" },
      { property: "og:description", content: "Request outsole samples for your footwear program." },
    ],
  }),
  component: RequestSamplePage,
});

type FormStatus = "idle" | "submitting" | "success" | "error";

function RequestSamplePage() {
  const { dict } = useI18n();
  const { selected } = Route.useLoaderData();
  const { data: hero } = useSuspenseQuery(interiorHeroQuery);
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const validationSchema = useMemo(
    () =>
      z.object({
        client_name: z.string().trim().min(2, dict.sample.validation.nameRequired).max(100),
        company_name: z.string().trim().min(2, dict.sample.validation.companyRequired).max(100),
        email: z.string().trim().email(dict.sample.validation.emailInvalid).max(255),
        phone: z.string().trim().max(50).optional().or(z.literal("")),
        message: z.string().trim().min(10, dict.sample.validation.messageRequired).max(2000),
        outsole_id: z.string().uuid().optional().or(z.literal("")),
      }),
    [dict.sample.validation]
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InquiryInput>({
    resolver: zodResolver(validationSchema),
    defaultValues: {
      outsole_id: selected?.id ?? "",
    },
  });

  const onSubmit = async (data: InquiryInput) => {
    setStatus("submitting");
    setErrorMessage("");
    try {
      await submitInquiry({ data });
      setStatus("success");
    } catch (err) {
      setStatus("error");
      const msg =
        err instanceof Error && err.message.length < 400
          ? err.message
          : dict.sample.error.defaultMessage;
      setErrorMessage(msg);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <section className="shell py-24 md:py-32">
        <span className="rule-accent" />
        <p className="label-tech mt-6 text-primary">{dict.sample.success.statusTag}</p>
        <h1 className="display-lg mt-4">{dict.sample.success.title}</h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          {dict.sample.success.message}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> {dict.sample.success.backCatalog}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
          >
            {dict.sample.success.returnHome}
          </Link>
        </div>
      </section>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────────
  const inputCls =
    "mt-2 h-11 w-full border border-input bg-surface px-3 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none";
  const inputErrCls = inputCls + " border-destructive";
  const errTxt = "mt-1 text-xs text-destructive";

  return (
    <>
      <InteriorHero
        config={hero.config}
        imageUrl={hero.imageUrl}
        eyebrow={dict.sample.eyebrow}
        title={dict.sample.title}
        description={dict.sample.description}
      />

      <section className="shell py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
          {/* ── Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
            {/* Hidden outsole_id — value comes from defaultValues; server validates the UUID */}
            <input type="hidden" {...register("outsole_id")} />

            {/* Selected outsole context */}
            {selected && (
              <div className="border border-border bg-card px-5 py-4">
                <p className="label-tech text-muted-foreground">{dict.sample.selectedOutsole}</p>
                <p className="mt-2 text-lg font-semibold">{selected.name}</p>
                <p className="label-tech mt-1 text-primary">{selected.model}</p>
              </div>
            )}

            {/* Server error banner */}
            {status === "error" && (
              <div role="alert" className="border border-destructive bg-destructive/10 px-5 py-4">
                <p className="label-tech text-destructive">{dict.sample.error.statusTag}</p>
                <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            )}

            {/* Name + Company */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="rs-client-name" className="label-tech block">
                  {dict.sample.form.nameLabel} <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-client-name"
                  type="text"
                  autoComplete="name"
                  placeholder={dict.sample.form.namePlaceholder}
                  aria-invalid={errors.client_name ? "true" : undefined}
                  aria-describedby={errors.client_name ? "err-client-name" : undefined}
                  {...register("client_name")}
                  className={errors.client_name ? inputErrCls : inputCls}
                />
                {errors.client_name && (
                  <p id="err-client-name" role="alert" className={errTxt}>
                    {errors.client_name.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="rs-company-name" className="label-tech block">
                  {dict.sample.form.companyLabel} <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-company-name"
                  type="text"
                  autoComplete="organization"
                  placeholder={dict.sample.form.companyPlaceholder}
                  aria-invalid={errors.company_name ? "true" : undefined}
                  aria-describedby={errors.company_name ? "err-company-name" : undefined}
                  {...register("company_name")}
                  className={errors.company_name ? inputErrCls : inputCls}
                />
                {errors.company_name && (
                  <p id="err-company-name" role="alert" className={errTxt}>
                    {errors.company_name.message}
                  </p>
                )}
              </div>
            </div>

            {/* Email + Phone */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="rs-email" className="label-tech block">
                  {dict.sample.form.emailLabel} <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-email"
                  type="email"
                  autoComplete="email"
                  placeholder={dict.sample.form.emailPlaceholder}
                  aria-invalid={errors.email ? "true" : undefined}
                  aria-describedby={errors.email ? "err-email" : undefined}
                  {...register("email")}
                  className={errors.email ? inputErrCls : inputCls}
                />
                {errors.email && (
                  <p id="err-email" role="alert" className={errTxt}>
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="rs-phone" className="label-tech block">
                  {dict.sample.form.phoneLabel}{" "}
                  <span className="text-muted-foreground">({dict.common.optional})</span>
                </label>
                <input
                  id="rs-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder={dict.sample.form.phonePlaceholder}
                  {...register("phone")}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="rs-message" className="label-tech block">
                {dict.sample.form.messageLabel} <span aria-hidden="true" className="text-primary">*</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                {dict.sample.form.messageHint}
              </p>
              <textarea
                id="rs-message"
                rows={6}
                placeholder={dict.sample.form.messagePlaceholder}
                aria-invalid={errors.message ? "true" : undefined}
                aria-describedby={errors.message ? "err-message" : undefined}
                {...register("message")}
                className={
                  "mt-2 w-full resize-y border px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none bg-surface focus:border-primary " +
                  (errors.message ? "border-destructive" : "border-input")
                }
              />
              {errors.message && (
                <p id="err-message" role="alert" className={errTxt}>
                  {errors.message.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              id="rs-submit"
              type="submit"
              disabled={status === "submitting"}
              className="inline-flex items-center justify-center gap-2 bg-primary px-8 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === "submitting" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {dict.sample.form.submittingBtn}
                </>
              ) : (
                <>
                  {dict.sample.form.submitBtn} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Sidebar ── */}
          <aside className="space-y-8 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <p className="label-tech">{dict.sample.sidebar.nextHeading}</p>
              <ol className="mt-4 space-y-4">
                {[
                  dict.sample.sidebar.step1,
                  dict.sample.sidebar.step2,
                  dict.sample.sidebar.step3,
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="data-mono shrink-0 text-primary">0{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t border-border pt-8">
              <p className="label-tech">{dict.sample.sidebar.programHeading}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {dict.sample.sidebar.programDesc}
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
