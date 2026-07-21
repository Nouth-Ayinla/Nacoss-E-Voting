import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

export const metadata = {
  title: "Terms of Service | NACOSS E-Voting Portal",
  description: "Terms of Service and Code of Conduct governing participation in NACOSS Departmental E-Voting.",
};

export default function TermsPage() {
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
              Legal & Conduct
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
              Terms of Service
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base">
              Effective for all registered voters, candidates, and portal visitors.
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 text-on-surface text-sm md:text-base leading-relaxed">
            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing or registering on the NACOSS Department of Computer Science E-Voting Portal, you agree to comply with these Terms of Service, the departmental constitution, and the rulings of the NACOSS Electoral Committee (ELECO).
              </p>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                2. Voter Eligibility Requirements
              </h2>
              <p>To participate as a voter in any departmental election, you must satisfy the following criteria:</p>
              <ul className="list-disc list-inside space-y-2 text-on-surface-variant pl-2">
                <li>Be a currently matriculated undergraduate student in the Department of Computer Science.</li>
                <li>Complete the voter registration process within the announced registration timeframe.</li>
                <li>Provide authentic, untampered identification documents (Student ID Card or stamped Course Registration Form).</li>
                <li>Be verified and approved by the Electoral Committee.</li>
              </ul>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                3. Code of Conduct & Anti-Fraud Rules
              </h2>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-sm">
                <strong>Strict Warning:</strong> Fraudulent activities, multiple registrations, or impersonation will lead to immediate disqualification and referral to the Departmental Disciplinary Committee.
              </div>
              <p>Participants are strictly prohibited from:</p>
              <ul className="list-disc list-inside space-y-2 text-on-surface-variant pl-2">
                <li>Attempting to register more than once using multiple matriculation numbers or fake credentials.</li>
                <li>Sharing, selling, or transferring your voting PIN or OTP to another person.</li>
                <li>Using automated scripts, bots, proxy tools, or denial-of-service attempts against the portal.</li>
                <li>Coercing, bribing, or intimidating other voters during the voting window.</li>
              </ul>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                4. Electoral Committee Powers
              </h2>
              <p className="text-on-surface-variant">
                The NACOSS Electoral Committee reserves the absolute right to verify credentials, reject invalid registrations, pause elections in the event of technical emergencies, and disqualify any candidate or voter found violating electoral integrity rules.
              </p>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                5. Limitation of Liability
              </h2>
              <p className="text-on-surface-variant">
                The platform is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis. While every effort is made to maintain 99.9% uptime and security, NACOSS and the system developers shall not be liable for internet disruptions on the voter&apos;s end or unauthorized access arising from a voter sharing their credentials.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
