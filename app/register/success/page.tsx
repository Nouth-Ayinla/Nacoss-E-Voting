"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={null}>
      <RegisterSuccessContent />
    </Suspense>
  );
}

function RegisterSuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const name = searchParams.get("name") ?? "";
  const matric = searchParams.get("matric") ?? "";

  return (
    <main className="font-body-md text-on-surface selection:bg-primary-container selection:text-on-primary-container min-h-screen flex flex-col items-center justify-center p-gutter relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none -z-10 flex items-center justify-center opacity-[0.04] select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="NACOSS FUTA Chapter Watermark" className="w-[80%] max-w-[500px] object-contain rotate-[-12deg]" />
      </div>
      <div className="fixed top-0 left-0 w-full h-1 bg-primary-container z-50" />

      <div className="w-full max-w-xl mx-auto flex flex-col items-center">
        <div className="mb-stack-lg text-center flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="NACOSS FUTA Chapter Logo" className="w-16 h-16 object-contain mb-2" />
          <h1 className="font-headline-md text-headline-md font-bold text-primary tracking-tight">
            NACOSS FUTA Chapter E-Voting Portal
          </h1>
          <p className="font-label-caps text-label-caps text-on-surface-variant mt-1 uppercase">
            Department of Computer Science
          </p>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant w-full p-stack-lg rounded shadow-sm">
          <div className="flex flex-col items-center text-center mb-stack-lg">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold uppercase tracking-wider mb-4">
              <span className="material-symbols-outlined text-sm">task_alt</span>
              Response Recorded
            </div>
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-stack-md">
              <span
                className="material-symbols-outlined text-emerald-600 text-6xl select-none"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
            </div>
            <h2 className="font-headline-md text-headline-md text-on-surface font-bold tracking-tight">
              Your response has been submitted
            </h2>
            <p className="text-on-surface-variant mt-stack-sm max-w-md text-body-md">
              Your voter registration and verification document have been recorded. You do not need to register again.
            </p>
          </div>

          <div className="bg-surface-container-low border border-outline-variant rounded-lg p-stack-md mb-stack-md">
            <div className="flex justify-between items-center mb-stack-sm border-b border-outline-variant pb-stack-xs">
              <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                Recorded Submission
              </span>
              <span className="bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Status: Pending Review
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-sm">
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Full Name</span>
                <span className="font-body-md text-on-surface font-medium">{name || "—"}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-on-surface-variant">Matric Number</span>
                <span className="font-technical-code text-technical-code text-primary bg-surface-container-highest/50 px-2 py-1 rounded w-fit mt-1">
                  {matric || "—"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-stack-lg text-body-sm text-blue-900 dark:text-blue-200">
            <div className="flex items-start gap-2.5">
              <span className="material-symbols-outlined text-blue-600 text-lg shrink-0 mt-0.5">info</span>
              <div>
                <strong className="font-semibold block mb-0.5">What happens next?</strong>
                The Electoral Committee is verifying your submitted document. You will receive an email once approved. You can also check your registration status anytime using the Status Checker on the Home page.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-stack-sm w-full">
            <button
              onClick={() => router.push("/")}
              className="w-full bg-primary hover:bg-primary/95 text-white font-bold py-3.5 px-6 rounded-full transition-all duration-200 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
            >
              Go to Home Page & Check Status
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
            <a
              className="w-full text-center py-2 text-primary font-bold font-body-sm hover:underline flex items-center justify-center gap-1 mt-1"
              href="/guidelines"
            >
              <span className="material-symbols-outlined text-sm">description</span>
              Read Election Guidelines
            </a>
          </div>
        </div>

        <footer className="mt-stack-lg text-center">
          <p className="font-label-caps text-label-caps text-on-surface-variant">
            © 2026 NACOSS FUTA Chapter Department of Computer Science. All rights reserved.
          </p>
        </footer>
      </div>

      <div className="absolute inset-0 pointer-events-none -z-10 overflow-hidden">
        <svg className="absolute w-full h-full opacity-[0.03]" height="100%" width="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern height="40" id="grid" patternUnits="userSpaceOnUse" width="40">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect fill="url(#grid)" height="100%" width="100%" />
        </svg>
      </div>
    </main>
  );
}
