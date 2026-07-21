import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | NACOSS E-Voting Portal",
  description: "Privacy Policy and Data Protection standards for the NACOSS Department of Computer Science E-Voting System.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-charcoal-slate">
      <SiteHeader />
      <main className="flex-grow pt-24 pb-16 px-margin-mobile">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* Breadcrumb / Back button */}
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
              Legal & Compliance
            </span>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-on-surface-variant text-sm md:text-base">
              Last updated: March 2026 • Effective for all NACOSS Departmental Elections
            </p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 text-on-surface text-sm md:text-base leading-relaxed">
            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                1. Overview & Commitment
              </h2>
              <p>
                The National Association of Computer Science Students (NACOSS) Electoral Committee is committed to protecting the privacy, identity, and voting secrecy of all eligible voters in the Department of Computer Science. This Privacy Policy details how we collect, handle, encrypt, and safeguard your personal data during the e-voting process.
              </p>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                2. Information We Collect
              </h2>
              <p>To verify eligibility and ensure one-person-one-vote integrity, we collect the following data during registration:</p>
              <ul className="list-disc list-inside space-y-2 text-on-surface-variant pl-2">
                <li><strong className="text-on-surface">Full Name & Matriculation Number:</strong> Used to confirm your status as an active Computer Science student.</li>
                <li><strong className="text-on-surface">Institutional Email Address:</strong> Used strictly for transmitting OTPs, verification PINs, and voting confirmation receipts.</li>
                <li><strong className="text-on-surface">Student ID Card / Course Form Document:</strong> Uploaded for manual verification by authorized Electoral Officers.</li>
                <li><strong className="text-on-surface">Technical Audit Logs:</strong> Timestamped IP addresses and browser fingerprints logged during registration to prevent automated bot subversions.</li>
              </ul>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                3. Ballot Secrecy & Vote Anonymity
              </h2>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-950 text-sm">
                <strong>Absolute Vote Secrecy Guarantee:</strong> Your vote selection is completely decoupled from your personal identity upon submission.
              </div>
              <p>
                When a ballot is cast, your secret PIN signs the ballot cryptographically. The resulting vote token is stored in an encrypted database ledger separate from the voter registration index. No Electoral Officer, System Administrator, or external entity can trace a specific cast vote back to your matriculation number or name.
              </p>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                4. Data Storage, Security & Retention
              </h2>
              <ul className="list-disc list-inside space-y-2 text-on-surface-variant pl-2">
                <li><strong className="text-on-surface">Encryption at Rest & in Transit:</strong> All data transmitted over HTTPS is encrypted using TLS 1.3. Uploaded identity documents are stored in secure Cloudflare R2 storage with restricted access policies.</li>
                <li><strong className="text-on-surface">Access Controls:</strong> Document inspection is strictly restricted to designated Electoral Committee officers via authenticated admin tokens.</li>
                <li><strong className="text-on-surface">Data Retention Period:</strong> Identity documents and temporary verification logs are permanently deleted 30 days after the official ratification and publication of election results.</li>
              </ul>
            </section>

            <section className="bg-white border border-outline-variant/40 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-primary flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                5. Contact & Support
              </h2>
              <p className="text-on-surface-variant">
                If you have questions regarding this Privacy Policy or suspect unauthorized access to your voting credentials, please contact the NACOSS Electoral Committee via email at{" "}
                <a href="mailto:support@nacoss-evoting.org" className="text-primary font-medium hover:underline">
                  eleco@nacoss-evoting.org
                </a>.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
