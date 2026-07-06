import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — DealSheet",
  description: "Privacy Policy for DealSheet — how we handle your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <nav className="bg-white border-b border-[#F0EDE6] px-6 py-3">
        <Link href="/" className="font-bold text-[#1C1810]">DealSheet</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-sm">
        <h1>Privacy Policy</h1>
        <p className="text-[#A39C8E]">Last updated: July 2026</p>

        <h2>What We Collect</h2>
        <ul>
          <li><strong>Account data:</strong> email address, hashed password, Stripe customer ID</li>
          <li><strong>Uploaded documents:</strong> purchase agreement PDFs you choose to process</li>
          <li><strong>Extracted data:</strong> structured deal information (parties, price, dates, contingencies)</li>
          <li><strong>Usage data:</strong> number of extractions, pages visited, feature usage</li>
        </ul>

        <h2>How We Use Your Data</h2>
        <ul>
          <li>To provide the extraction and underwriting service</li>
          <li>To process payments and manage subscriptions</li>
          <li>To improve the service and detect abuse</li>
          <li>To send transactional emails (verification, receipts, password reset)</li>
        </ul>

        <h2>Data Storage & Security</h2>
        <p>Uploaded PDFs are processed in memory and not permanently stored. Extracted deal data is stored in encrypted databases on Railway (US-based servers). We use Stripe for payment processing — we never see or store your full payment details.</p>

        <h2>Data Retention</h2>
        <p>Your account data and extracted deals are retained while your account is active. You can delete your account and all associated data by emailing support@dealsheet.app. We retain anonymized usage statistics after deletion.</p>

        <h2>Third-Party Services</h2>
        <ul>
          <li><strong>Stripe:</strong> payment processing (see their privacy policy)</li>
          <li><strong>Google AI (Gemini):</strong> document text extraction (no training on your data)</li>
          <li><strong>Railway:</strong> cloud hosting</li>
          <li><strong>Resend:</strong> transactional emails</li>
        </ul>

        <h2>Your Rights</h2>
        <p>You can request access to, correction of, or deletion of your personal data at any time. Email support@dealsheet.app. We will respond within 30 days.</p>

        <h2>Cookies</h2>
        <p>We use essential cookies for authentication and Stripe Checkout sessions. We do not use tracking cookies or third-party analytics cookies.</p>

        <h2>Contact</h2>
        <p>Privacy questions: support@dealsheet.app</p>
      </div>
    </div>
  );
}
