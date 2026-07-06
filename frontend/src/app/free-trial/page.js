"use client";

import { useState } from "react";
import Link from "next/link";

export default function FreeTrialPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      return;
    }

    try {
      const res = await fetch("/api/free-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  if (submitted) {
    return (
      <div className="auth-gradient min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="glass-card-solid rounded-3xl elevated-shadow w-full max-w-md p-8 lg:p-10 animate-fade-in text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[#1C1810] mb-2">You&apos;re in!</h1>
          <p className="text-[#8A8272] text-sm mb-6">
            We&apos;ve sent your free extraction link to <strong>{email}</strong>. Check your inbox!
          </p>
          <p className="text-xs text-[#A39C8E]">
            (If you don&apos;t see it, check spam. Your free extraction is ready to go.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-gradient min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="glass-card-solid rounded-3xl elevated-shadow w-full max-w-md p-8 lg:p-10 animate-fade-in relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1C1810] via-[#B5652B] to-[#D4A017] flex items-center justify-center text-white font-bold text-xl shadow-lg">
              D
            </div>
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold text-[#1C1810] tracking-tight">
            Try DealSheet Free
          </h1>
          <p className="text-[#8A8272] text-sm mt-1.5">
            Upload one purchase agreement. Get instant data extraction.
          </p>
        </div>

        {error && (
          <div className="bg-[#FBEEEC]/80 border border-[#E8C4BC] text-[#9B3A22] p-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Work Email</label>
            <div className="input-wrap rounded-2xl">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern w-full border-2 border-[#E8E4DC] rounded-2xl px-4 py-3.5 text-base bg-white/70 outline-none text-[#1C1810] placeholder:text-[#A39C8E]"
                placeholder="you@brokerage.com"
                required
              />
            </div>
          </div>
          <button type="submit"
            className="btn-accent w-full text-white py-4 rounded-2xl font-semibold text-sm min-h-[52px]">
            Send My Free Extraction →
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-[#F0EDE6]">
          <div className="flex items-center justify-center gap-4 text-xs text-[#A39C8E]">
            <span className="flex items-center gap-1">🔒 One free extraction</span>
            <span className="w-1 h-1 rounded-full bg-[#E8E4DC]" />
            <span>⚡ No credit card</span>
          </div>
        </div>
      </div>
    </div>
  );
}
