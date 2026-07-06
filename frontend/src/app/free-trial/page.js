"use client";

import { useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function FreeTrialPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API}/api/free-trial`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="auth-page">
        <div className="auth-card text-center animate-fade-in">
          <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">✅</span>
          </div>
          <h1>You&apos;re in!</h1>
          <p className="subtitle">
            We&apos;ve sent your free extraction link to <strong>{email}</strong>.
          </p>
          <p className="text-xs text-[#A39C8E] mt-4">
            (If you don&apos;t see it, check spam.)
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-in">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-lg shadow-sm">
              D
            </div>
          </Link>
          <h1>Try DealSheet Free</h1>
          <p className="subtitle">Upload one purchase agreement. Get instant data extraction.</p>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl mb-5 text-sm animate-fade-in">
            <span className="text-lg shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#453D30] mb-1.5">Work Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="input-field" placeholder="you@brokerage.com" required />
          </div>
          <button type="submit" disabled={loading}
            className="btn btn-primary btn-full">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="spinner !w-4 !h-4 !border-2 !border-white/30 !border-t-white" />
                Sending...
              </span>
            ) : "Send My Free Extraction →"}
          </button>
        </form>

        <hr className="separator" />
        <div className="flex items-center justify-center gap-4 text-xs text-[#A39C8E]">
          <span>🔒 One free extraction</span>
          <span className="w-1 h-1 rounded-full bg-[#E8E4DC]" />
          <span>⚡ No credit card</span>
        </div>
      </div>
    </div>
  );
}
