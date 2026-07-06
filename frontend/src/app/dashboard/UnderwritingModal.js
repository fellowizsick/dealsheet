"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function InputRow({ label, value, onChange, placeholder, type = "number", suffix }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <label className="text-xs text-[#453D30] font-medium min-w-[120px]">{label}</label>
      <div className="flex items-center gap-1 flex-1 max-w-[200px]">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder={placeholder}
          className="w-full border border-[#E8E4DC] rounded-lg px-2.5 py-1.5 text-xs text-[#1C1810] outline-none focus:border-[#B5652B] bg-white"
        />
        {suffix && <span className="text-[10px] text-[#A39C8E] whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, format, good, bad }) {
  const fmt = format === "pct" ? `${value ?? "—"}%` : format === "usd" ? `$${(value ?? 0).toLocaleString()}` : value ?? "—";
  const isGood = value != null && good !== undefined && value >= good;
  const isBad = value != null && bad !== undefined && value <= bad;
  const color = isGood ? "text-emerald-600" : isBad ? "text-red-500" : "text-[#1C1810]";
  return (
    <div className="bg-[#FAF9F6] rounded-xl p-3 border border-[#F0EDE6]">
      <p className="text-[10px] text-[#A39C8E] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{fmt}</p>
    </div>
  );
}

export default function UnderwritingModal({ deal, token, onClose }) {
  const [assumptions, setAssumptions] = useState({
    purchase_price: deal?.result?.financial_terms?.purchase_price || 0,
    monthly_rent: "",
    annual_expenses: "",
    down_payment_percent: 20,
    interest_rate: 6.5,
    loan_term_years: 30,
    rehab_cost: "",
    after_repair_value: "",
    closing_costs: 0,
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [tab, setTab] = useState("income"); // income | flip

  // Load saved underwriting on mount
  useState(() => {
    if (!token) return;
    fetch(`${API}/extractions/${deal.id}/underwrite`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.assumptions) {
          setAssumptions({
            purchase_price: data.assumptions.purchase_price || 0,
            monthly_rent: data.assumptions.monthly_rent || "",
            annual_expenses: data.assumptions.annual_expenses ?? "",
            down_payment_percent: data.assumptions.down_payment_percent || 20,
            interest_rate: data.assumptions.interest_rate || 6.5,
            loan_term_years: data.assumptions.loan_term_years || 30,
            rehab_cost: data.assumptions.rehab_cost ?? "",
            after_repair_value: data.assumptions.after_repair_value ?? "",
            closing_costs: data.assumptions.closing_costs || 0,
          });
          setSavedResult(data);
          setResult(data);
        }
      })
      .catch(() => {});
  }, [deal.id, token]);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/extractions/${deal.id}/underwrite`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          purchase_price: Number(assumptions.purchase_price) || 0,
          monthly_rent: assumptions.monthly_rent ? Number(assumptions.monthly_rent) : null,
          annual_expenses: assumptions.annual_expenses !== "" ? Number(assumptions.annual_expenses) : null,
          down_payment_percent: Number(assumptions.down_payment_percent) || 20,
          interest_rate: Number(assumptions.interest_rate) || 6.5,
          loan_term_years: Number(assumptions.loan_term_years) || 30,
          rehab_cost: assumptions.rehab_cost !== "" ? Number(assumptions.rehab_cost) : null,
          after_repair_value: assumptions.after_repair_value !== "" ? Number(assumptions.after_repair_value) : null,
          closing_costs: Number(assumptions.closing_costs) || 0,
        }),
      });
      const data = await r.json();
      setResult(data);
      setSavedResult(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-[#F0EDE6] max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EDE6]">
          <div>
            <h2 className="text-sm font-semibold text-[#1C1810]">Deal Analysis</h2>
            <p className="text-[10px] text-[#A39C8E]">{deal.filename || deal.result?.property?.street_address || `Deal #${deal.id}`}</p>
          </div>
          <button onClick={onClose} className="text-[#A39C8E] hover:text-[#1C1810] text-lg leading-none">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#F0EDE6] px-5">
          <button onClick={() => setTab("income")} className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${tab === "income" ? "border-[#B5652B] text-[#B5652B]" : "border-transparent text-[#A39C8E] hover:text-[#453D30]"}`}>
            Income Property
          </button>
          <button onClick={() => setTab("flip")} className={`py-2.5 px-3 text-xs font-medium border-b-2 transition-colors ${tab === "flip" ? "border-[#B5652B] text-[#B5652B]" : "border-transparent text-[#A39C8E] hover:text-[#453D30]"}`}>
            Fix & Flip
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Results */}
          {result && (
            <div className="grid grid-cols-2 gap-2">
              {tab === "income" && (
                <>
                  <MetricCard label="Cap Rate" value={result.cap_rate} format="pct" good={8} bad={4} />
                  <MetricCard label="Cash-on-Cash" value={result.cash_on_cash_return} format="pct" good={10} bad={5} />
                  <MetricCard label="Monthly Cash Flow" value={result.monthly_cash_flow} format="usd" good={200} bad={0} />
                  <MetricCard label="Total Cash Invested" value={result.total_cash_invested} format="usd" />
                  <MetricCard label="Mortgage Payment" value={result.debt_service} format="usd" />
                  <MetricCard label="NOI (Annual)" value={result.noi} format="usd" />
                </>
              )}
              {tab === "flip" && (
                <>
                  <MetricCard label="Flip Profit" value={result.flip_profit} format="usd" good={30000} bad={0} />
                  <MetricCard label="Flip Margin" value={result.flip_margin} format="pct" good={20} bad={10} />
                  <MetricCard label="Total Cash Invested" value={result.total_cash_invested} format="usd" />
                  <MetricCard label="Purchase Price" value={result.assumptions?.purchase_price} format="usd" />
                </>
              )}
            </div>
          )}

          {/* Input Form */}
          <div className="space-y-1">
            <h3 className="text-[10px] font-semibold text-[#453D30] uppercase tracking-wider mb-2">Assumptions</h3>

            <InputRow label="Purchase Price" value={assumptions.purchase_price} onChange={(v) => setAssumptions({ ...assumptions, purchase_price: v })} placeholder="400000" suffix="$" />

            {tab === "income" && (
              <>
                <InputRow label="Monthly Rent" value={assumptions.monthly_rent} onChange={(v) => setAssumptions({ ...assumptions, monthly_rent: v })} placeholder="2500" suffix="$" />
                <InputRow label="Annual Expenses" value={assumptions.annual_expenses} onChange={(v) => setAssumptions({ ...assumptions, annual_expenses: v })} placeholder="6000" suffix="$" />
                <InputRow label="Down Payment" value={assumptions.down_payment_percent} onChange={(v) => setAssumptions({ ...assumptions, down_payment_percent: v })} placeholder="20" suffix="%" />
                <InputRow label="Interest Rate" value={assumptions.interest_rate} onChange={(v) => setAssumptions({ ...assumptions, interest_rate: v })} placeholder="6.5" suffix="%" />
                <InputRow label="Loan Term" value={assumptions.loan_term_years} onChange={(v) => setAssumptions({ ...assumptions, loan_term_years: v })} placeholder="30" suffix="yrs" />
                <InputRow label="Closing Costs" value={assumptions.closing_costs} onChange={(v) => setAssumptions({ ...assumptions, closing_costs: v })} placeholder="3000" suffix="$" />
              </>
            )}

            {tab === "flip" && (
              <>
                <InputRow label="Rehab Cost" value={assumptions.rehab_cost} onChange={(v) => setAssumptions({ ...assumptions, rehab_cost: v })} placeholder="50000" suffix="$" />
                <InputRow label="After Repair Value" value={assumptions.after_repair_value} onChange={(v) => setAssumptions({ ...assumptions, after_repair_value: v })} placeholder="550000" suffix="$" />
                <InputRow label="Closing Costs" value={assumptions.closing_costs} onChange={(v) => setAssumptions({ ...assumptions, closing_costs: v })} placeholder="3000" suffix="$" />
              </>
            )}
          </div>

          <button
            onClick={runAnalysis}
            disabled={loading || !assumptions.purchase_price}
            className="w-full bg-[#1C1810] hover:bg-[#453D30] disabled:bg-[#E8E4DC] disabled:text-[#A39C8E] text-white text-xs font-semibold py-2.5 rounded-xl transition-colors"
          >
            {loading ? "Analyzing..." : savedResult ? "Re-analyze" : "Run Analysis"}
          </button>

          {savedResult && !result && (
            <p className="text-[10px] text-[#A39C8E] text-center">Saved analysis loaded. Adjust assumptions and re-run.</p>
          )}
        </div>
      </div>
    </div>
  );
}
