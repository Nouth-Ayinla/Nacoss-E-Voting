"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IdUploadZone from "@/components/IdUploadZone";
import CountdownTimer from "@/components/CountdownTimer";

type Step = 1 | 2;

type QuotaInfo = {
  dailyCount: number;
  dailyLimit: number;
  remaining: number;
  isFull: boolean;
};

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [documentType, setDocumentType] = useState<"idcard" | "courseform">("idcard");
  const [idFile, setIdFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [electionState, setElectionState] = useState<string>("upcoming");
  const [election, setElection] = useState<any>(null);

  useEffect(() => {
    fetch("/api/voters/register")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: QuotaInfo | null) => {
        if (data) setQuota(data);
      })
      .catch(() => {
        // Fallback gracefully without logging raw exceptions
      });

    fetch("/api/election-state")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setElection(data);
          if (data.state) setElectionState(data.state);
        }
      })
      .catch(() => {});
  }, []);

  function handleStepOneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (quota?.isFull) return;
    if (!fullName.trim() || !email.trim()) return;
    setStep(2);
  }

  async function handleStepTwoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setIsAlreadyRegistered(false);

    if (quota?.isFull) {
      setSubmitError("Daily registration limit reached (120/120). Resets at 00:00 AM.");
      return;
    }

    if (!matricNumber.trim()) return;
    if (!idFile) {
      setFileError(documentType === "courseform" ? "Please attach your course form." : "Please attach your student ID card.");
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("matricNumber", matricNumber.trim());
      formData.append("name", fullName.trim());
      formData.append("email", email.trim());
      formData.append("documentType", documentType);
      formData.append("idCard", idFile);

      const res = await fetch("/api/voters/register", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setIsAlreadyRegistered(true);
        }
        setSubmitError(
          typeof data.error === "string" ? data.error : "Registration failed. Check your details and try again."
        );
        setIsSubmitting(false);
        return;
      }

      const params = new URLSearchParams({
        name: fullName.trim(),
        matric: matricNumber.trim(),
      });
      router.push(`/register/success?${params.toString()}`);
    } catch {
      setSubmitError("Network error. Please try again.");
      setIsSubmitting(false);
    }
  }

  const isScheduled = election?.startTime && new Date(election.startTime).getTime() > Date.now();

  if (isScheduled || electionState === "ongoing" || electionState === "ended") {
    return (
      <>
        <SiteHeader />
        <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-margin-mobile relative overflow-hidden">
          <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded shadow-sm overflow-hidden p-8 text-center space-y-6">
            <span className="material-symbols-outlined text-primary text-display-lg block mx-auto">
              lock
            </span>
            <div className="space-y-2">
              <h1 className="font-headline-md text-headline-md font-bold text-charcoal-slate">
                Registration Closed
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {electionState === "ongoing"
                  ? "The election is currently ongoing. Registration is closed."
                  : electionState === "ended"
                  ? "The election has ended. Registration is closed."
                  : "Registration has closed because the election has been scheduled."}
              </p>
            </div>

            {isScheduled && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider animate-pulse">
                  Voting starts in:
                </p>
                <CountdownTimer
                  targetDate={election.startTime}
                  onComplete={() => {
                    router.push("/");
                  }}
                />
              </div>
            )}

            <div className="pt-4">
              <Link
                href={electionState === "ongoing" ? "/vote" : "/"}
                className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-full font-bold text-xs hover:brightness-105 active:scale-95 transition-all shadow-sm"
              >
                {electionState === "ongoing" ? "Go to Voting Page" : "Return to Homepage"}
                <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>
          </div>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-margin-mobile relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-[0.04] select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS FUTA Chapter Watermark" className="w-[80%] max-w-[500px] object-contain rotate-[-12deg]" />
        </div>
        <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded shadow-sm overflow-hidden">
          <div className="p-stack-lg bg-surface-container-low border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="font-headline-md text-headline-md font-bold text-charcoal-slate mb-1">
                {step === 1 ? "Voter Entry & Registration" : "Step 2 of 2: Academic Credentials"}
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Verify your identity to participate in the upcoming departmental elections.
              </p>
            </div>

            {/* Daily Quota Counter Badge */}
            {quota && (
              <div
                className={`self-start sm:self-auto shrink-0 px-3 py-1.5 rounded-full text-[12px] font-bold tracking-wider flex items-center gap-1.5 border ${quota.isFull
                    ? "bg-error-container text-on-error-container border-error/30"
                    : "bg-primary/10 text-primary border-primary/20"
                  }`}
                title="Daily registration limit resets every day at 00:00 AM"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {quota.isFull ? "block" : "mail"}
                </span>
                <span>
                  Quota: {quota.dailyCount} / {quota.dailyLimit}
                </span>
              </div>
            )}
          </div>

          {/* Warning banner when daily limit is reached */}
          {quota?.isFull && (
            <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-4 flex items-start gap-3 text-amber-800 dark:text-amber-300">
              <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">warning</span>
              <div className="text-body-sm">
                <strong className="font-semibold block mb-0.5">Daily Limit Reached (120/120)</strong>
                Registration is temporarily capped to manage daily email allocations. The quota resets tomorrow at 00:00 AM.
              </div>
            </div>
          )}

          {/* Voting started banner */}
          {electionState === "ongoing" && (
            <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-6 py-4 flex items-start gap-3 text-emerald-800 dark:text-emerald-300">
              <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0 mt-0.5 animate-pulse">how_to_vote</span>
              <div className="text-body-sm flex-grow">
                <strong className="font-semibold block mb-0.5">Voting Has Started!</strong>
                The voting portal is now open. If you have already registered and been verified, you can proceed directly to cast your vote.
                <div className="mt-2">
                  <Link href="/vote" className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline bg-white px-3 py-1 rounded-full border border-outline-variant shadow-xs">
                    Go to Voting Page
                    <span className="material-symbols-outlined text-xs">arrow_forward</span>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <form className="p-stack-lg space-y-stack-md" onSubmit={handleStepOneSubmit}>
              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="full_name">
                  Full Name
                </label>
                <input
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-body-md text-charcoal-slate placeholder:text-outline disabled:opacity-60"
                  id="full_name"
                  name="full_name"
                  placeholder="Enter your official name"
                  type="text"
                  required
                  disabled={quota?.isFull}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-body-md text-charcoal-slate placeholder:text-outline disabled:opacity-60"
                  id="email"
                  name="email"
                  placeholder="akindele45@gmail.com"
                  type="email"
                  required
                  disabled={quota?.isFull}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="pt-stack-md">
                <button
                  className="w-full h-14 bg-primary-container text-white font-body-md text-body-md font-bold rounded-full hover:bg-primary transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={quota?.isFull}
                >
                  {quota?.isFull ? "Limit Reached (120/120)" : "Next"}
                </button>
                <p className="text-center font-label-caps text-[11px] text-on-surface-variant mt-stack-md">
                  By registering, you agree to the NACOSS FUTA Chapter Election Guidelines and Data Privacy Policy.
                </p>
              </div>
            </form>
          )}

          {step === 2 && (
            <form className="p-stack-lg space-y-stack-md" onSubmit={handleStepTwoSubmit}>
              <div className="space-y-stack-xs">
                <label
                  className="font-label-caps text-label-caps text-on-surface-variant uppercase"
                  htmlFor="matric_number"
                >
                  Matric Number
                </label>
                <input
                  className="monospaced-input uppercase w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-technical-code text-technical-code text-charcoal-slate placeholder:text-outline disabled:opacity-60"
                  id="matric_number"
                  name="matric_number"
                  placeholder="CSC/20/0001"
                  type="text"
                  required
                  disabled={quota?.isFull}
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                />
              </div>

              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Verification Document
                </label>
                <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
                  <button
                    type="button"
                    disabled={quota?.isFull}
                    onClick={() => {
                      setDocumentType("idcard");
                      setIdFile(null);
                      setFileError(null);
                    }}
                    className={`py-2 px-3 rounded-md text-body-sm font-semibold transition-all ${documentType === "idcard"
                        ? "bg-primary text-white shadow-sm"
                        : "text-on-surface-variant hover:text-charcoal-slate hover:bg-surface-container-high"
                      }`}
                  >
                    Student ID Card
                  </button>
                  <button
                    type="button"
                    disabled={quota?.isFull}
                    onClick={() => {
                      setDocumentType("courseform");
                      setIdFile(null);
                      setFileError(null);
                    }}
                    className={`py-2 px-3 rounded-md text-body-sm font-semibold transition-all ${documentType === "courseform"
                        ? "bg-primary text-white shadow-sm"
                        : "text-on-surface-variant hover:text-charcoal-slate hover:bg-surface-container-high"
                      }`}
                  >
                    Course Form
                  </button>
                </div>
              </div>

              <IdUploadZone
                file={idFile}
                onFileSelect={(f) => {
                  setIdFile(f);
                  setFileError(null);
                }}
                error={fileError}
                documentType={documentType}
              />

              {submitError && (
                <div className={`rounded-lg p-4 text-body-sm flex flex-col gap-2.5 border ${isAlreadyRegistered
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-900 dark:text-amber-200"
                    : "bg-error-container text-on-error-container border-error/30"
                  }`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${isAlreadyRegistered ? "text-amber-600" : ""}`}>
                      {isAlreadyRegistered ? "info" : "error"}
                    </span>
                    <div>
                      <strong className="font-semibold block mb-0.5">
                        {isAlreadyRegistered ? "Registration Already Submitted" : "Registration Issue"}
                      </strong>
                      {submitError}
                    </div>
                  </div>
                  {isAlreadyRegistered && (
                    <button
                      type="button"
                      onClick={() => router.push("/")}
                      className="mt-1 self-start inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline bg-white dark:bg-surface-container-high px-3.5 py-1.5 rounded-full border border-outline-variant shadow-xs transition-colors"
                    >
                      Check Verification Status on Homepage
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                    </button>
                  )}
                </div>
              )}

              <div className="pt-stack-md">
                <button
                  className="w-full h-14 bg-primary-container text-white font-body-md text-body-md font-bold rounded-full hover:bg-primary transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                  type="submit"
                  disabled={isSubmitting || quota?.isFull}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Processing...
                    </>
                  ) : quota?.isFull ? (
                    "Limit Reached (120/120)"
                  ) : (
                    <>
                      Complete Registration
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                    onClick={() => setStep(1)}
                  >
                    Go Back
                  </button>
                </div>
                <p className="text-center font-label-caps text-[11px] text-on-surface-variant mt-stack-md">
                  By registering, you agree to the NACOSS FUTA Chapter Election Guidelines and Data Privacy Policy.
                </p>
              </div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
