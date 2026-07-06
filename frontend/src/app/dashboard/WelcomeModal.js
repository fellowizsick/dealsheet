"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const WELCOME_SHOWN_KEY = "dealsheet_welcome_shown";

export default function WelcomeModal({ onClose }) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const alreadyShown = localStorage.getItem(WELCOME_SHOWN_KEY);
    if (!alreadyShown) setVisible(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(WELCOME_SHOWN_KEY, "1");
    setVisible(false);
    if (onClose) onClose();
  };

  if (!visible) return null;

  const steps = [
    {
      icon: "📄",
      title: "Upload a contract",
      desc: "Drop a purchase agreement PDF — DealSheet extracts parties, pricing, dates, and contingencies automatically.",
      action: "Upload your first contract →",
      href: "/",
    },
    {
      icon: "📊",
      title: "Analyze any deal",
      desc: "Click 'Analyze' on any deal to run underwriting — cap rate, cash-on-cash return, and flip analysis in seconds.",
      action: "Go to dashboard",
      href: "/dashboard",
    },
    {
      icon: "📋",
      title: "Track your pipeline",
      desc: "Move deals through Active → Under Contract → Closed. See your total volume and charts at a glance.",
      action: "Get started",
      href: null,
    },
  ];

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in" onClick={dismiss}>
      <div className="bg-white rounded-2xl p-6 lg:p-8 max-w-md w-full shadow-2xl border border-[#F0EDE6]" onClick={(e) => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1C1810]/5 to-[#B5652B]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">{s.icon}</span>
          </div>
          <h2 className="text-lg font-semibold text-[#1C1810] mb-2">{s.title}</h2>
          <p className="text-sm text-[#A39C8E]">{s.desc}</p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {steps.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? "bg-[#B5652B] w-6" : "bg-[#E8E4DC]"}`} />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[#E8E4DC] text-[#453D30] hover:bg-[#FAF9F6] transition-colors">
              Back
            </button>
          ) : (
            <button onClick={dismiss}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl border border-[#E8E4DC] text-[#A39C8E] hover:text-[#453D30] transition-colors">
              Skip
            </button>
          )}

          {step < steps.length - 1 ? (
            <button onClick={() => setStep(step + 1)}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#1C1810] text-white font-semibold hover:bg-[#453D30] transition-colors">
              Next →
            </button>
          ) : s.href ? (
            <Link href={s.href} onClick={dismiss}
              className="flex-1 text-center text-sm px-4 py-2.5 rounded-xl bg-[#1C1810] text-white font-semibold hover:bg-[#453D30] transition-colors">
              {s.action}
            </Link>
          ) : (
            <button onClick={dismiss}
              className="flex-1 text-sm px-4 py-2.5 rounded-xl bg-[#1C1810] text-white font-semibold hover:bg-[#453D30] transition-colors">
              {s.action}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
