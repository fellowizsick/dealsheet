import Link from "next/link";

export const metadata = {
  title: "DealSheet — AI-Powered Real Estate Document Extraction",
  description: "Upload purchase agreements and get structured deal data in seconds. Parties, price, dates, contingencies — extracted automatically.",
};

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-[#1e3a5f]">DealSheet</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
            <Link href="/signup" className="text-sm bg-[#1e3a5f] text-white px-4 py-2 rounded-lg hover:bg-[#2d5a8e] transition">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="brand-gradient min-h-[85vh] flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-white">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            From PDF to<br />
            <span className="text-emerald-300">Deal Data</span> in Seconds
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Upload a purchase agreement. DealSheet extracts parties, price, key dates, and contingencies
            automatically — so you don&apos;t have to read the fine print.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="glow-button bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 transition shadow-lg">
              Try DealSheet Free
            </Link>
            <Link href="#how-it-works" className="bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition border border-white/20">
              See How It Works
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-4">No credit card required • 50 free extractions/month</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1e3a5f] mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload", desc: "Drag & drop a purchase agreement PDF. Works with any standard residential contract." },
              { step: "2", title: "Extract", desc: "Gemini AI reads the document and extracts parties, price, deadlines, and contingencies." },
              { step: "3", title: "Export", desc: "Review, edit, and download as CSV. Share with clients or import into your CRM." },
            ].map((item) => (
              <div key={item.step} className="text-center rich-shadow rounded-xl p-8 hover:-translate-y-1 transition">
                <div className="w-12 h-12 bg-[#1e3a5f] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1e3a5f] mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "Smart Extraction", desc: "AI identifies buyers, sellers, property details, financial terms, and every contingency." },
              { icon: "📊", title: "Structured Data", desc: "Clean JSON or CSV output. Ready for spreadsheets, CRMs, or closing docs." },
              { icon: "✏️", title: "In-App Editing", desc: "Click any field to correct it. Your edits stay for the export." },
              { icon: "📄", title: "PDF Preview", desc: "See the original document side-by-side with extracted data. Verify everything at a glance." },
              { icon: "📅", title: "Key Dates Timeline", desc: "Inspection deadlines, financing contingencies, closing dates — all highlighted." },
              { icon: "🔒", title: "Secure & Private", desc: "Documents processed in memory and discarded. Your data never stored." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 rich-shadow hover:shadow-lg transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1e3a5f] mb-4">Simple Pricing</h2>
          <p className="text-gray-500 text-center mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Free", price: "$0", extractions: "50/month", features: ["AI extraction", "CSV export", "7-day history"], cta: "Get Started", popular: false },
              { name: "Pro", price: "$19", extractions: "500/month", features: ["Everything in Free", "Unlimited history", "Batch CSV export", "Priority support"], cta: "Start Pro", popular: true },
              { name: "Agency", price: "$49", extractions: "2,000/month", features: ["Everything in Pro", "Team sharing", "API access", "Custom branding"], cta: "Contact Us", popular: false },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-xl p-6 rich-shadow ${plan.popular ? "ring-2 ring-emerald-500 bg-white scale-105" : "bg-white"}`}>
                {plan.popular && <span className="text-xs bg-emerald-500 text-white px-3 py-1 rounded-full font-medium">Most Popular</span>}
                <h3 className="text-xl font-bold text-gray-900 mt-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-[#1e3a5f] my-2">{plan.price}<span className="text-sm font-normal text-gray-400">/month</span></p>
                <p className="text-sm text-gray-500 mb-4">{plan.extractions}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="text-emerald-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block text-center py-3 rounded-lg font-semibold text-sm transition ${plan.popular ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="brand-gradient py-20">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stop Reading Contracts. Start Closing Deals.</h2>
          <p className="text-white/80 mb-8">Join agents and transaction coordinators saving hours on every deal.</p>
          <Link href="/signup" className="glow-button bg-emerald-500 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-emerald-600 transition inline-block">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-white/60 py-8 text-center text-sm">
        <p>© 2026 DealSheet. Built for real estate professionals.</p>
      </footer>
    </div>
  );
}
