"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

const POSITIONS = [
  "President",
  "Vice President",
  "General Secretary",
  "Assistant General Secretary",
  "Financial Secretary",
  "Public Relation Officer",
  "Treasurer",
  "Welfare Director",
  "Director of Sports",
  "Director of Socials",
  "Director of Software",
];

type Step = 1 | 2;

export default function CandidateApplyPage() {
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState("");
  const [positionType, setPositionType] = useState("");
  const [levelType, setLevelType] = useState("");
  const [manifesto, setManifesto] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasAlreadySubmitted, setHasAlreadySubmitted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const submitted = localStorage.getItem("candidate_submitted") === "true";
      const submittedId = localStorage.getItem("candidate_submitted_id");

      if (submitted) {
        setHasAlreadySubmitted(true);

        if (submittedId) {
          fetch("/api/candidates")
            .then((res) => {
              if (res.ok) return res.json();
              throw new Error("Failed to fetch candidates");
            })
            .then((candidates) => {
              const exists = candidates.some((c: any) => c.id === submittedId);
              if (!exists) {
                localStorage.removeItem("candidate_submitted");
                localStorage.removeItem("candidate_submitted_id");
                setHasAlreadySubmitted(false);
              }
            })
            .catch((err) => {
              console.error("Failed to verify candidate submission status:", err);
            });
        }
      }
    }
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be less than 5MB.");
      return;
    }

    setImageFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleNextStep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!positionType) {
      setError("Please select a position.");
      return;
    }
    if (!levelType) {
      setError("Please select your academic level.");
      return;
    }

    setStep(2);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!fullName.trim()) {
      setError("Please enter your name.");
      setStep(1);
      return;
    }
    if (!positionType) {
      setError("Please select a position.");
      setStep(1);
      return;
    }
    if (!levelType) {
      setError("Please select your academic level.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/candidates/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fullName.trim(),
          position: positionType,
          level: parseInt(levelType, 10),
          imageUrl: imageUrl || undefined,
          manifesto: manifesto.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit candidate profile.");
      } else {
        localStorage.setItem("candidate_submitted", "true");
        if (data && data.id) {
          localStorage.setItem("candidate_submitted_id", data.id);
        }
        setSuccess(true);
        // Clear form
        setFullName("");
        setPositionType("");
        setLevelType("");
        setManifesto("");
        setImageUrl("");
        setImageFile(null);
        setStep(1);
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="flex-grow bg-surface text-charcoal-slate min-h-screen pt-20 sm:pt-24 pb-12 sm:pb-16 px-4 sm:px-margin-mobile relative overflow-hidden bg-[radial-gradient(#eceef0_1px,transparent_1px)] [background-size:24px_24px]">
        {/* Subtle decorative background glow */}
        <div className="absolute top-[10%] left-1/2 -translate-x-1/2 w-[280px] sm:w-[500px] h-[280px] sm:h-[500px] bg-primary-fixed/20 blur-[80px] sm:blur-[120px] rounded-full pointer-events-none -z-10" />

        <div className="max-w-xl mx-auto space-y-6 sm:space-y-8">
          <div className="text-center space-y-2 sm:space-y-3">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary font-label-caps text-xs font-bold uppercase tracking-wider">
              Candidate Portal
            </span>
            <h1 className="font-headline-md sm:font-headline-lg text-headline-md sm:text-headline-lg text-charcoal-slate font-extrabold uppercase tracking-tight leading-tight">
              {hasAlreadySubmitted ? "Profile Already Filed" : success ? "Submission Complete" : step === 1 ? "Step 1: Profile Details" : "Step 2: Campaign Manifesto"}
            </h1>
          </div>

          <div className="bg-white border border-outline-variant rounded-xl sm:rounded-2xl p-5 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
            {hasAlreadySubmitted ? (
              <div className="animate-slide-in p-5 sm:p-6 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center space-y-4">
                <span className="material-symbols-outlined text-amber-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  lock_person
                </span>
                <h3 className="font-bold text-amber-800 text-body-lg">Application Already Filed</h3>
                <p className="text-body-sm text-amber-700 max-w-xs sm:max-w-md mx-auto leading-relaxed">
                  You have already submitted a candidate application profile from this device. Multiple submissions are not permitted. If you need to correct your profile details, please contact the electoral committee.
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center w-full sm:w-auto px-6 h-11 bg-primary text-white rounded-full text-xs font-semibold shadow transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : success ? (
              <div className="animate-slide-in p-5 sm:p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-4">
                <span className="material-symbols-outlined text-emerald-600 text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  check_circle
                </span>
                <h3 className="font-bold text-emerald-800 text-body-lg">Application Submitted!</h3>
                <p className="text-body-sm text-emerald-700 max-w-xs sm:max-w-md mx-auto leading-relaxed">
                  Your candidate profile has been recorded. It will appear on the admin dashboard for the electoral committee's review. Only one submission is permitted per device.
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center w-full sm:w-auto px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold shadow transition-colors"
                  >
                    Back to Home
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-5 sm:space-y-6">
                {error && (
                  <div className="p-4 bg-error-container text-on-error-container border border-error/25 rounded-lg text-body-sm font-medium flex items-start gap-2 animate-slide-in">
                    <span className="material-symbols-outlined text-base shrink-0 mt-0.5">error</span>
                    <span>{error}</span>
                  </div>
                )}

                {step === 1 ? (
                  <form onSubmit={handleNextStep} className="space-y-5 sm:space-y-6">
                    <div className="space-y-stack-xs">
                      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs" htmlFor="fullName">
                        Official Full Name
                      </label>
                      <input
                        id="fullName"
                        className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
                        placeholder="e.g. Adegoke Michael"
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-stack-xs">
                      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs" htmlFor="positionSelect">
                        Executive Post
                      </label>
                      <select
                        id="positionSelect"
                        className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate bg-white"
                        value={positionType}
                        onChange={(e) => setPositionType(e.target.value)}
                        required
                      >
                        <option value="" disabled>-- Select Position --</option>
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>{pos}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-stack-xs">
                      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs" htmlFor="levelSelect">
                        Academic Level (100 - 300)
                      </label>
                      <select
                        id="levelSelect"
                        className="w-full h-12 px-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate bg-white"
                        value={levelType}
                        onChange={(e) => setLevelType(e.target.value)}
                        required
                      >
                        <option value="" disabled>-- Select Level --</option>
                        <option value="100">100 Level</option>
                        <option value="200">200 Level</option>
                        <option value="300">300 Level</option>
                      </select>
                    </div>

                    {/* Photo Upload Component */}
                    <div className="space-y-2">
                      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs flex items-center justify-between">
                        <span>Profile Picture</span>
                        <span className="normal-case text-outline text-[11px]">Maximum size 5MB</span>
                      </label>

                      <div className="flex flex-col sm:flex-row gap-5 items-center text-center sm:text-left bg-surface-container-low p-5 rounded-xl border border-outline-variant">
                        {/* Picture Preview */}
                        <div className="w-20 h-20 rounded-full bg-white border-2 border-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-inner">
                          {imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={imageUrl} alt="Candidate Profile Preview" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-outline text-3xl">account_circle</span>
                          )}
                        </div>

                        <div className="flex-grow space-y-2.5 w-full flex flex-col items-center sm:items-start">
                          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                            <label className="w-full sm:w-auto bg-primary text-white text-xs font-semibold px-6 py-3.5 rounded-full cursor-pointer hover:bg-primary/95 transition-all flex items-center justify-center gap-2 shadow-sm">
                              <span className="material-symbols-outlined text-base">cloud_upload</span>
                              Upload Image File
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                              />
                            </label>
                            {imageUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setImageUrl("");
                                  setImageFile(null);
                                }}
                                className="text-xs text-error font-medium hover:underline flex items-center gap-1 py-1.5"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span> Remove Photo
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-on-surface-variant font-medium">
                            Supported formats: JPEG, PNG, WEBP.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* CTAs Row */}
                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                      <Link
                        href="/"
                        className="w-full sm:w-auto h-12 px-6 border border-outline-variant text-charcoal-slate font-semibold text-body-sm rounded-full shadow-sm hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                      >
                        Cancel
                      </Link>

                      <button
                        className="w-full sm:w-auto h-12 px-8 bg-primary text-white font-semibold text-body-sm rounded-full shadow-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                        type="submit"
                      >
                        Next Step
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
                    <div className="space-y-stack-xs">
                      <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs" htmlFor="manifesto">
                        Campaign Manifesto
                      </label>
                      <textarea
                        id="manifesto"
                        className="w-full p-4 bg-white border border-outline-variant rounded focus:ring-2 focus:ring-primary-container focus:border-primary transition-all font-body-md text-charcoal-slate"
                        placeholder="Share your goals, commitments, and manifestos with the department..."
                        rows={6}
                        value={manifesto}
                        onChange={(e) => setManifesto(e.target.value)}
                        maxLength={2000}
                        disabled={isSubmitting}
                      />
                      <div className="text-right text-xs text-on-surface-variant font-medium">
                        {manifesto.length} / 2000 characters
                      </div>
                    </div>

                    {/* CTAs Row */}
                    <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-full sm:w-auto h-12 px-6 border border-outline-variant text-charcoal-slate font-semibold text-body-sm rounded-full shadow-sm hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                        disabled={isSubmitting}
                      >
                        <span className="material-symbols-outlined text-base">arrow_back</span>
                        Go Back
                      </button>

                      <button
                        className="w-full sm:w-auto h-12 px-8 bg-primary text-white font-semibold text-body-sm rounded-full shadow-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
                        type="submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <span className="material-symbols-outlined animate-spin text-base">refresh</span>
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Profile
                            <span className="material-symbols-outlined text-base">send</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
