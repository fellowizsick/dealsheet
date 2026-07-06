import Link from "next/link";

export const metadata = {
  title: "Terms of Service — DealSheet",
  description: "Terms of Service for DealSheet — AI-powered real estate contract extraction.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      <nav className="bg-white border-b border-[#F0EDE6] px-6 py-3">
        <Link href="/" className="font-bold text-[#1C1810]">DealSheet</Link>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-12 prose prose-sm">
        <h1>Terms of Service</h1>
        <p className="text-[#A39C8E]">Last updated: July 2026</p>

        <h2>1. Service</h2>
        <p>DealSheet provides AI-powered extraction and analysis of real estate purchase agreements. The service is provided "as is" without warranty of accuracy. Extracted data should be reviewed by a qualified professional before use in any legal or financial decision.</p>

        <h2>2. Accounts</h2>
        <p>You are responsible for maintaining the confidentiality of your account credentials. You must provide accurate email and contact information. One account per user — sharing accounts is prohibited.</p>

        <h2>3. Payments & Billing</h2>
        <p>Subscriptions are billed monthly via Stripe. You can cancel at any time — access continues until the end of your billing period. No prorated refunds for partial months. Refund requests within 14 days of purchase will be reviewed on a case-by-case basis.</p>

        <h2>4. Usage Limits</h2>
        <p>Free accounts are limited to 50 extractions per day. Paid accounts have unlimited extractions subject to fair use (excessive automated usage may result in rate limiting).</p>

        <h2>5. Data Handling</h2>
        <p>Uploaded documents are processed in memory and not permanently stored. Extracted data is saved to your account for pipeline tracking. We do not use your uploaded contracts to train AI models. We implement industry-standard encryption for data in transit (TLS) and at rest.</p>

        <h2>6. Prohibited Uses</h2>
        <p>You may not use DealSheet to: (a) extract data from documents you do not own or have authorization to process, (b) upload malicious content, (c) attempt to bypass rate limits or access controls, (d) reverse engineer the service.</p>

        <h2>7. Limitation of Liability</h2>
        <p>DealSheet is a tool to assist with data extraction. It is not a substitute for professional legal or financial advice. We are not liable for any losses resulting from the use or inability to use the service.</p>

        <h2>8. Changes</h2>
        <p>We may update these terms at any time. Continued use after changes constitutes acceptance. We will notify you via email of material changes.</p>

        <h2>9. Contact</h2>
        <p>Questions? Email us at support@dealsheet.app.</p>
      </div>
    </div>
  );
}
