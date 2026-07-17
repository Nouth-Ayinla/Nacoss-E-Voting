"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import IdUploadZone from "@/components/IdUploadZone";

type Step = 1 | 2;

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

  function handleStepOneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    setStep(2);
  }

  async function handleStepTwoSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);

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

  return (
    <>
      <SiteHeader />
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-margin-mobile relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-[0.04] select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS Watermark" className="w-[80%] max-w-[500px] object-contain rotate-[-12deg]" />
        </div>
        <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant rounded shadow-sm overflow-hidden">
          <div className="p-stack-lg bg-surface-container-low border-b border-outline-variant">
            <h1 className="font-headline-md text-headline-md font-bold text-charcoal-slate mb-1">
              {step === 1 ? "Voter Entry & Registration" : "Step 2 of 2: Academic Credentials"}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Verify your identity to participate in the upcoming departmental elections.
            </p>
          </div>

          {step === 1 && (
            <form className="p-stack-lg space-y-stack-md" onSubmit={handleStepOneSubmit}>
              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="full_name">
                  Full Name
                </label>
                <input
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-body-md text-charcoal-slate placeholder:text-outline"
                  id="full_name"
                  name="full_name"
                  placeholder="Enter your official name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase" htmlFor="email">
                  Email Address
                </label>
                <input
                  className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-body-md text-charcoal-slate placeholder:text-outline"
                  id="email"
                  name="email"
                  placeholder="akindele45@gmail.com"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="pt-stack-md">
                <button
                  className="w-full h-14 bg-primary-container text-white font-body-md text-body-md font-bold rounded-full hover:bg-primary transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
                  type="submit"
                >
                  Next
                </button>
                <p className="text-center font-label-caps text-[11px] text-on-surface-variant mt-stack-md">
                  By registering, you agree to the NACOSS Election Guidelines and Data Privacy Policy.
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
                  className="monospaced-input w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-technical-code text-technical-code text-charcoal-slate placeholder:text-outline"
                  id="matric_number"
                  name="matric_number"
                  placeholder="CS/2026/0001"
                  type="text"
                  required
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value)}
                />
              </div>

              <div className="space-y-stack-xs">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                  Verification Document
                </label>
                <div className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-lg border border-outline-variant">
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentType("idcard");
                      setIdFile(null);
                      setFileError(null);
                    }}
                    className={`py-2 px-3 rounded-md text-body-sm font-semibold transition-all ${
                      documentType === "idcard"
                        ? "bg-primary text-white shadow-sm"
                        : "text-on-surface-variant hover:text-charcoal-slate hover:bg-surface-container-high"
                    }`}
                  >
                    Student ID Card
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDocumentType("courseform");
                      setIdFile(null);
                      setFileError(null);
                    }}
                    className={`py-2 px-3 rounded-md text-body-sm font-semibold transition-all ${
                      documentType === "courseform"
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
                <div className="bg-error-container text-on-error-container rounded px-4 py-3 text-body-sm">
                  {submitError}
                </div>
              )}

              <div className="pt-stack-md">
                <button
                  className="w-full h-14 bg-primary-container text-white font-body-md text-body-md font-bold rounded-full hover:bg-primary transition-colors shadow-sm flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-60"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">refresh</span>
                      Processing...
                    </>
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
                  By registering, you agree to the NACOSS Election Guidelines and Data Privacy Policy.
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
