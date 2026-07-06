"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  const [loading, setLoading] = useState(null);

  const handleCheckout = async (plan) => {
    setLoading(plan);
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const r = await fetch(`${API}/stripe/create-checkout?plan=${plan}`, {
        method: "POST",
        headers,
      });
      const data = await r.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Please sign in first to subscribe.");
        window.location.href = "/login";
      }
    } catch (e) {
      alert("Checkout unavailable. Try again or sign in first.");
      window.location.href = "/login";
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-[#F0EDE6]">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <span className="text-xl font-bold text-[#1C1810]">DealSheet</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-[#A39C8E] hover:text-[#1C1810]">Sign In</Link>
            <Link href="/signup" className="text-sm bg-[#1C1810] text-white px-4 py-2 rounded-xl hover:bg-[#453D30] transition">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#1C1810] via-[#453D30] to-[#B5652B] min-h-[85vh] flex items-center pt-16">
        <div className="max-w-6xl mx-auto px-6 py-20 text-center text-white">
          <h1 className="text-5xl lg:text-7xl font-bold mb-6 leading-tight">
            From PDF to<br />
            <span className="text-[#D98A4D]">Deal Data</span> in Seconds
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Upload a purchase agreement. DealSheet extracts parties, price, key dates, and contingencies
            automatically — then analyzes whether the deal makes money.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup" className="bg-white text-[#1C1810] px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/90 transition shadow-lg">
              Try DealSheet Free
            </Link>
            <Link href="#how-it-works" className="bg-white/10 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/20 transition border border-white/20">
              See How It Works
            </Link>
          </div>
          <p className="text-white/50 text-sm mt-4">No credit card required • 200 free extractions/month</p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1C1810] mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Upload", desc: "Drag & drop a purchase agreement PDF. Works with any standard residential contract." },
              { step: "2", title: "Extract", desc: "AI reads the document and extracts parties, price, deadlines, and contingencies automatically." },
              { step: "3", title: "Analyze", desc: "Get instant underwriting: cap rate, cash-on-cash return, and flip margin on every deal." },
            ].map((item) => (
              <div key={item.step} className="text-center border border-[#F0EDE6] rounded-xl p-8 hover:shadow-lg transition">
                <div className="w-12 h-12 bg-[#1C1810] text-white rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-[#1C1810] mb-2">{item.title}</h3>
                <p className="text-[#A39C8E]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1C1810] mb-12">Everything You Need</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🔍", title: "Smart Extraction", desc: "AI identifies buyers, sellers, property details, financial terms, and every contingency." },
              { icon: "📊", title: "Deal Underwriting", desc: "Cap rate, cash-on-cash return, flip margin — auto-calculated from extracted data." },
              { icon: "📋", title: "Pipeline Kanban", desc: "Track deals from Active → Under Contract → Closed. Favorites, tags, status updates." },
              { icon: "📄", title: "CSV Export", desc: "Clean data ready for spreadsheets, CRMs, or closing docs. Batch export available." },
              { icon: "📱", title: "PWA Mobile App", desc: "Install to your phone's home screen. Full pipeline on the go, no app store needed." },
              { icon: "🔒", title: "Secure & Private", desc: "Documents processed in memory and discarded. Your deal data stays yours." },
            ].map((f) => (
              <div key={f.title} className="bg-white rounded-xl p-6 border border-[#F0EDE6] hover:shadow-md transition">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-[#1C1810] mb-1">{f.title}</h3>
                <p className="text-sm text-[#A39C8E]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white" id="pricing">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center text-[#1C1810] mb-4">Simple Pricing</h2>
          <p className="text-[#A39C8E] text-center mb-12">Start free. Upgrade when you need more.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { id: "free", name: "Free", price: "$0", desc: "200 extractions/month", features: ["AI extraction", "CSV export", "Pipeline kanban", "7-day history"], cta: "Get Started", popular: false, href: "/signup" },
              { id: "pro", name: "Pro", price: "$29", desc: "Unlimited extractions", features: ["Everything in Free", "Unlimited history", "Deal underwriting analysis", "Batch export", "Priority support"], cta: "Subscribe", popular: true, href: null },
              { id: "agency", name: "Agency", price: "$49", desc: "Unlimited + Team", features: ["Everything in Pro", "Team sharing (up to 5)", "API access", "Custom branding", "White-label exports"], cta: "Subscribe", popular: false, href: null },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-xl p-6 border ${plan.popular ? "ring-2 ring-[#B5652B] bg-white scale-105 border-[#B5652B]" : "bg-white border-[#F0EDE6]"}`}>
                {plan.popular && <span className="text-xs bg-[#B5652B] text-white px-3 py-1 rounded-full font-medium">Most Popular</span>}
                <h3 className="text-xl font-bold text-[#1C1810] mt-2">{plan.name}</h3>
                <p className="text-3xl font-bold text-[#1C1810] my-2">{plan.price}<span className="text-sm font-normal text-[#A39C8E]">/month</span></p>
                <p className="text-sm text-[#A39C8E] mb-4">{plan.desc}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="text-sm text-[#453D30] flex items-center gap-2">
                      <span className="text-[#B5652B]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                {plan.href ? (
                  <Link href={plan.href} className="block text-center py-3 rounded-xl font-semibold text-sm transition bg-[#1C1810] text-white hover:bg-[#453D30]">
                    {plan.cta}
                  </Link>
                ) : (
                  <button onClick={() => handleCheckout(plan.id)}
                    disabled={loading === plan.id}
                    className="w-full text-center py-3 rounded-xl font-semibold text-sm transition bg-[#1C1810] text-white hover:bg-[#453D30] disabled:bg-[#E8E4DC] disabled:text-[#A39C8E]">
                    {loading === plan.id ? "Redirecting..." : plan.cta}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-[#1C1810] via-[#453D30] to-[#B5652B] py-20">
        <div className="max-w-3xl mx-auto px-6 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stop Reading Contracts. Start Closing Deals.</h2>
          <p className="text-white/80 mb-8">Join agents and transaction coordinators saving hours on every deal.</p>
          <Link href="/signup" className="bg-white text-[#1C1810] px-8 py-4 rounded-xl text-lg font-semibold hover:bg-white/90 transition inline-block">
            Get Started Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1C1810] text-white/40 py-8 text-center text-sm">
        <p>© 2026 DealSheet. Built for real estate professionals.</p>
        <div className="flex items-center justify-center gap-4 mt-2">
          <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
        </div>
      </footer>
    </div>
  );
}