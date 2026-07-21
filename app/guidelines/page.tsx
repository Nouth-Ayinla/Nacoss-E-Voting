import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

export const metadata = {
  title: "Election Guidelines | NACOSS E-Voting Portal",
  description: "Official voting rules, registration instructions, and step-by-step electoral guidelines for NACOSS elections.",
};

export default function GuidelinesPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-charcoal-slate">
      <SiteHeader />
      <main className="flex-grow pt-24 pb-16 px-margin-mobile">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Breadcrumb */}
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Page Header */}
          <div className="space-y-3 border-b border-outline-variant/40 pb-6">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-widest bg-primary-fixed/30 text-primary rounded-full">
              Electoral Handbook
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
              Election Guidelines
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base">
              Step-by-step instructions for registering, verifying your status, and casting your ballot.
            </p>
          </div>

          {/* Guidelines Steps */}
          <div className="space-y-8 text-on-surface text-sm md:text-base leading-relaxed">
            {/* Step 1 */}
            <div className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  1
                </span>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-primary">Voter Registration Phase</h2>
                  <p className="text-on-surface-variant">
                    Before voting opens, every eligible Computer Science student must complete online registration:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant pl-2">
                    <li>Go to the <Link href="/register" className="text-primary font-semibold hover:underline">Voter Registration Page</Link>.</li>
                    <li>Enter your Full Name, official Email Address, and Matriculation Number.</li>
                    <li>Upload a clear photo of your Student ID card or stamped Course Registration Form.</li>
                    <li>Note the daily registration quota (e.g., 120 registrations per day). If full, return at 00:00 AM.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  2
                </span>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-primary">Verification & Approval</h2>
                  <p className="text-on-surface-variant">
                    The Electoral Committee verifies your uploaded documents against the departmental student database.
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant pl-2">
                    <li>You can check your verification status on the Home page using the Status Checker.</li>
                    <li>If approved, you will receive your unique secret **Voting PIN** via email before voting starts.</li>
                    <li>If rejected, check your email for the reason specified by the committee.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  3
                </span>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-primary">Casting Your Vote</h2>
                  <p className="text-on-surface-variant">
                    When the election status changes to <strong>ONGOING</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1.5 text-on-surface-variant pl-2">
                    <li>Navigate to the <Link href="/vote" className="text-primary font-semibold hover:underline">Voting Portal</Link>.</li>
                    <li>Log in using your Matriculation Number and secret Voting PIN.</li>
                    <li>Review candidate manifestos and select your preferred candidate for each position (or choose to abstain).</li>
                    <li>Submit your digital ballot. Once cast, your vote is permanent and cannot be altered.</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Step 4 */}
            <div className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm relative overflow-hidden">
              <div className="flex items-start gap-4">
                <span className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  4
                </span>
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-primary">Receipt & Results Audit</h2>
                  <p className="text-on-surface-variant">
                    After casting your vote, a cryptographic receipt token will be displayed on screen. Save this token! You can use it to verify that your ballot was successfully recorded in the election audit ledger.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
