import { createFileRoute, Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { getOutsole } from "@/lib/public-catalog.functions";
import { submitInquiry, inquirySchema } from "@/lib/inquiries.functions";
import type { InquiryInput } from "@/lib/inquiries.functions";

export const Route = createFileRoute("/request-sample")({
  validateSearch: (search: Record<string, unknown>): { product?: string } => {
    const p = search["product"];
    return typeof p === "string" && p.trim() ? { product: p.trim().slice(0, 150) } : {};
  },
  loaderDeps: ({ search }) => ({ product: search.product }),
  loader: async ({ deps }) => {
    if (!deps.product) return { selected: null };
    try {
      const res = await getOutsole({ data: { slug: deps.product } });
      const o = res.outsole;
      // Return id so the form can pass it as outsole_id to submitInquiry.
      // The server function validates the UUID against active outsoles anyway.
      return { selected: o ? { id: o.id, name: o.name, model: o.model_number } : null };
    } catch {
      return { selected: null };
    }
  },
  head: () => ({
    meta: [
      { title: "Request a Sample — Outsole Works" },
      { name: "description", content: "Request outsole samples for your footwear program." },
      { property: "og:title", content: "Request a Sample — Outsole Works" },
      { property: "og:description", content: "Request outsole samples for your footwear program." },
    ],
  }),
  component: RequestSamplePage,
});

type FormStatus = "idle" | "submitting" | "success" | "error";

function RequestSamplePage() {
  const { selected } = Route.useLoaderData();
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InquiryInput>({
    resolver: zodResolver(inquirySchema),
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
          : "We could not send your request. Please try again.";
      setErrorMessage(msg);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────────
  if (status === "success") {
    return (
      <section className="shell py-24 md:py-32">
        <span className="rule-accent" />
        <p className="label-tech mt-6 text-primary">Submitted</p>
        <h1 className="display-lg mt-4">Sample Request Sent</h1>
        <p className="mt-6 max-w-xl text-muted-foreground">
          Thank you. Your sample request has been received. Our team will review your request and
          contact you shortly.
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Catalog
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 border border-border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] hover:border-primary hover:text-primary"
          >
            Return Home
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
      {/* Page header */}
      <section className="border-b border-border">
        <div className="shell py-16 md:py-20">
          <span className="rule-accent" />
          <p className="label-tech mt-6">Sampling</p>
          <h1 className="display-xl mt-5">Request a Sample</h1>
          <p className="mt-6 max-w-2xl text-muted-foreground md:text-lg">
            Fill in your details below. Our team will review your request and contact you to arrange
            sampling.
          </p>
        </div>
      </section>

      <section className="shell py-12 md:py-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_18rem]">
          {/* ── Form ── */}
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-7">
            {/* Hidden outsole_id — value comes from defaultValues; server validates the UUID */}
            <input type="hidden" {...register("outsole_id")} />

            {/* Selected outsole context */}
            {selected && (
              <div className="border border-border bg-card px-5 py-4">
                <p className="label-tech text-muted-foreground">Selected outsole</p>
                <p className="mt-2 text-lg font-semibold">{selected.name}</p>
                <p className="label-tech mt-1 text-primary">{selected.model}</p>
              </div>
            )}

            {/* Server error banner */}
            {status === "error" && (
              <div role="alert" className="border border-destructive bg-destructive/10 px-5 py-4">
                <p className="label-tech text-destructive">Submission failed</p>
                <p className="mt-1 text-sm text-muted-foreground">{errorMessage}</p>
              </div>
            )}

            {/* Name + Company */}
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="rs-client-name" className="label-tech block">
                  Your name <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-client-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
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
                  Company <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-company-name"
                  type="text"
                  autoComplete="organization"
                  placeholder="Acme Footwear"
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
                  Email <span aria-hidden="true" className="text-primary">*</span>
                </label>
                <input
                  id="rs-email"
                  type="email"
                  autoComplete="email"
                  placeholder="jane@acme.com"
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
                  Phone{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="rs-phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+66 2 123 4567"
                  {...register("phone")}
                  className={inputCls}
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="rs-message" className="label-tech block">
                Message <span aria-hidden="true" className="text-primary">*</span>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                Include your program details, quantities, target application and any specifications.
              </p>
              <textarea
                id="rs-message"
                rows={6}
                placeholder="We are developing a trail running shoe line for SS27. We need outsoles with…"
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
                  Sending…
                </>
              ) : (
                <>
                  Send Request <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* ── Sidebar ── */}
          <aside className="space-y-8 border-t border-border pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div>
              <p className="label-tech">What happens next</p>
              <ol className="mt-4 space-y-4">
                {[
                  "We review your request and match it to our current production schedule.",
                  "Our team contacts you within 2–5 business days to discuss your program.",
                  "We arrange sampling, development, or a quote based on your needs.",
                ].map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-muted-foreground">
                    <span className="data-mono shrink-0 text-primary">0{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div className="border-t border-border pt-8">
              <p className="label-tech">Sampling programs</p>
              <p className="mt-4 text-sm text-muted-foreground">
                We support sample runs for new development programs, material evaluation and mold
                verification. Minimum quantities apply.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
