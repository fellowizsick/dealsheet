"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "./auth-context";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Home() {
  const [file, setFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editData, setEditData] = useState(null);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [isTouch] = useState(() => typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0));
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/landing");
  }, [token, authLoading, router]);

  useEffect(() => {
    if (result && !editData) setEditData(JSON.parse(JSON.stringify(result)));
  }, [result]);

  const handleFileSelect = useCallback((f) => {
    setFile(f);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    if (f) setFileUrl(URL.createObjectURL(f));
    setResult(null);
    setEditData(null);
    setEditing(null);
    setError(null);
  }, [fileUrl]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type === "application/pdf") handleFileSelect(f);
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch(`${API}/extract`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Extraction failed");
      setResult(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API}/extract/csv`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "extract.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateField = (section, field, value) => {
    setEditData((prev) => {
      const next = { ...prev };
      if (section === "parties") next.parties = value;
      else if (section === "contingencies") next.contingencies = value;
      else if (section === "extraction_notes") next.extraction_notes = value;
      else {
        if (!next[section]) next[section] = {};
        next[section] = { ...next[section], [field]: value };
      }
      return next;
    });
  };

  const EditableField = ({ section, field, value, label }) => (
    <div className="flex flex-col sm:flex-row sm:justify-between py-2.5 text-sm items-start sm:items-center group border-b border-[#F0EDE6] last:border-0">
      <span className="text-[#8A8272] text-xs font-medium uppercase tracking-wider mb-1 sm:mb-0">{label || field.replace(/_/g, " ")}</span>
      {editing === `${section}.${field}` ? (
        <input
          className="w-full sm:w-48 text-left sm:text-right border border-[#D98A4D]/40 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#D98A4D]/20 focus:border-[#D98A4D] outline-none bg-[#FAF9F6] text-[#1C1810]"
          value={value ?? ""}
          onChange={(e) => updateField(section, field, e.target.value)}
          onBlur={() => setEditing(null)}
          autoFocus
        />
      ) : (
        <span
          className="text-[#1C1810] font-medium cursor-pointer hover:bg-[#FAF9F6] px-3 py-2 rounded-xl transition-colors -ml-3"
          onClick={() => setEditing(`${section}.${field}`)}
        >
          {value ?? "—"}
        </span>
      )}
    </div>
  );

  if (authLoading) return (
    <div className="bg-[#FAF9F6] min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  );
  if (!token) return null;

  return (
    <div className="min-h-screen bg-[#FAF9F6]">
      {/* Mobile-first nav */}
      <nav className="bg-white/95 backdrop-blur-md border-b border-[#F0EDE6] sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-2.5 lg:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#1C1810] to-[#B5652B] flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-sm">D</div>
            <span className="font-bold text-[#1C1810] text-base lg:text-lg tracking-tight">DealSheet</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
            <Link href="/" className="text-xs lg:text-sm font-semibold text-[#1C1810]">Extract</Link>
            <Link href="/dashboard" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">Dashboard</Link>
            <Link href="/history" className="text-xs lg:text-sm text-[#8A8272] hover:text-[#1C1810]">History</Link>
            <button onClick={() => { logout(); router.push("/login"); }}
              className="text-xs lg:text-sm text-[#A39C8E] hover:text-[#9B3A22] transition-colors font-medium whitespace-nowrap ml-1">Logout</button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Left: Upload + PDF */}
          <div className="w-full lg:w-1/2 space-y-3 lg:space-y-4">
            <div>
              <h1 className="text-xl lg:text-3xl font-semibold text-[#1C1810] tracking-tight">Extract Deal Data</h1>
              <p className="text-xs lg:text-sm text-[#8A8272] mt-0.5 lg:mt-1">Upload a purchase agreement PDF to extract key details automatically.</p>
            </div>

            {!fileUrl ? (
              <div className="space-y-3 lg:space-y-4">
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  className={`drop-zone border-2 border-dashed rounded-2xl lg:rounded-3xl p-8 sm:p-10 lg:p-16 text-center bg-white cursor-pointer transition-all ${
                    dragging ? "dragging" : "border-[#E8E4DC]"
                  }`}
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input id="file-input" type="file" accept=".pdf" className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)} />
                  <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-xl lg:rounded-2xl bg-gradient-to-br from-[#1C1810]/5 to-[#B5652B]/10 flex items-center justify-center mx-auto mb-3 lg:mb-4">
                    <span className="text-2xl lg:text-3xl">📄</span>
                  </div>
                  <p className="text-sm lg:text-base text-[#1C1810] font-semibold mb-1">
                    {isTouch
                      ? "Tap to select a PDF"
                      : dragging
                        ? "Drop your PDF here"
                        : "Drop a PDF here or click to browse"}
                  </p>
                  <p className="text-xs lg:text-sm text-[#A39C8E]">Supports standard residential purchase agreements</p>
                </div>
                <div className="text-center">
                  <span className="text-xs text-[#A39C8E]">No contract handy? </span>
                  <button onClick={async () => {
                      const res = await fetch(`${API}/sample-contract`);
                      const blob = await res.blob();
                      handleFileSelect(new File([blob], "sample_contract.pdf", { type: "application/pdf" }));
                    }}
                    className="text-xs text-[#B5652B] hover:text-[#96501F] font-medium hover:underline">
                    Try with a sample contract →
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl lg:rounded-3xl elevated-shadow border border-[#F0EDE6] overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 lg:py-3.5 bg-[#FAF9F6] border-b border-[#F0EDE6]">
                  <div className="flex items-center gap-2 lg:gap-3 min-w-0">
                    <span className="text-base lg:text-lg">📄</span>
                    <span className="font-medium text-xs lg:text-sm truncate text-[#1C1810] max-w-[120px] sm:max-w-[200px]">{file?.name}</span>
                  </div>
                  <div className="flex gap-1.5 lg:gap-2 shrink-0">
                    <button onClick={handleUpload} disabled={loading}
                      className="btn-accent text-white px-3 lg:px-5 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-semibold disabled:opacity-40 min-h-[36px] lg:min-h-[44px]">
                      {loading ? (
                        <span className="flex items-center gap-1.5 lg:gap-2">
                          <div className="spinner !w-3 !h-3 lg:!w-3.5 lg:!h-3.5 !border-2 !border-white/30 !border-t-white" />
                          <span className="hidden sm:inline">Extracting</span>
                        </span>
                      ) : "Extract"}
                    </button>
                    {result && (
                      <button onClick={downloadCSV}
                        className="bg-[#F0EDE6] text-[#453D30] px-3 lg:px-4 py-1.5 lg:py-2 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-medium hover:bg-[#E8E4DC] transition-colors min-h-[36px] lg:min-h-[44px]">
                        CSV
                      </button>
                    )}
                    <button onClick={() => handleFileSelect(null)}
                      className="text-[#A39C8E] hover:text-[#9B3A22] transition-colors px-1.5 lg:px-2 text-base lg:text-lg">✕</button>
                  </div>
                </div>
                <div className="h-[60vh] max-h-[500px] lg:h-[600px] bg-[#FAF9F6]">
                  <iframe src={fileUrl} className="w-full h-full" title="PDF Preview" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="w-full lg:w-1/2 space-y-3 lg:space-y-4">
            {error && (
              <div className="bg-[#FBEEEC]/80 border border-[#E8C4BC] text-[#9B3A22] p-3 lg:p-4 rounded-2xl text-sm flex items-start gap-2 lg:gap-3 animate-fade-in">
                <span className="text-base lg:text-lg shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-2xl lg:rounded-3xl elevated-shadow border border-[#F0EDE6] p-8 lg:p-12 text-center animate-fade-in">
                <div className="spinner mx-auto mb-3 lg:mb-4" />
                <p className="text-[#453D30] font-medium text-sm lg:text-base">Analyzing contract...</p>
                <p className="text-[#A39C8E] text-xs lg:text-sm mt-1">Extracting parties, pricing, dates & contingencies</p>
              </div>
            )}

            {editData && !loading && (
              <div className="bg-white rounded-2xl lg:rounded-3xl elevated-shadow border border-[#F0EDE6] p-4 sm:p-5 lg:p-8 animate-fade-in">
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-[#B5652B]/10 to-[#D98A4D]/20 flex items-center justify-center">
                      <span className="text-base lg:text-lg">✨</span>
                    </div>
                    <h2 className="text-base lg:text-lg font-semibold text-[#1C1810] tracking-tight">Extracted Data</h2>
                  </div>
                  {editing && (
                    <button onClick={() => setEditing(null)}
                      className="text-xs text-[#B5652B] hover:text-[#96501F] font-medium bg-[#FAF9F6] px-2.5 lg:px-3 py-1.5 rounded-xl lg:rounded-2xl">
                      Done
                    </button>
                  )}
                </div>

                <div className="space-y-3 lg:space-y-5">
                  <Section title="Property">
                    <EditableField section="property" field="street_address" value={editData.property?.street_address} label="Address" />
                    <EditableField section="property" field="city" value={editData.property?.city} />
                    <EditableField section="property" field="state" value={editData.property?.state} />
                    <EditableField section="property" field="zip_code" value={editData.property?.zip_code} label="ZIP" />
                    <EditableField section="property" field="parcel_number" value={editData.property?.parcel_number} label="Parcel #" />
                  </Section>
                  <Section title="Parties">
                    {editData.parties?.map((p, i) => (
                      <EditableField key={i} section="parties" field={`${i}`} value={`${p.role}: ${p.name}`} label={p.role} />
                    ))}
                  </Section>
                  <Section title="Financial Terms">
                    <EditableField section="financial_terms" field="purchase_price" value={editData.financial_terms?.purchase_price ? `$${Number(editData.financial_terms.purchase_price).toLocaleString()}` : null} label="Purchase Price" />
                    <EditableField section="financial_terms" field="earnest_money_deposit" value={editData.financial_terms?.earnest_money_deposit ? `$${Number(editData.financial_terms.earnest_money_deposit).toLocaleString()}` : null} label="Earnest Money" />
                    <EditableField section="financial_terms" field="down_payment" value={editData.financial_terms?.down_payment ? `$${Number(editData.financial_terms.down_payment).toLocaleString()}` : null} label="Down Payment" />
                    <EditableField section="financial_terms" field="loan_amount" value={editData.financial_terms?.loan_amount ? `$${Number(editData.financial_terms.loan_amount).toLocaleString()}` : null} label="Loan Amount" />
                  </Section>
                  <Section title="Key Dates">
                    <EditableField section="key_dates" field="contract_date" value={editData.key_dates?.contract_date} label="Contract Date" />
                    <EditableField section="key_dates" field="inspection_deadline" value={editData.key_dates?.inspection_deadline} label="Inspection Deadline" />
                    <EditableField section="key_dates" field="financing_contingency_deadline" value={editData.key_dates?.financing_contingency_deadline} label="Financing Deadline" />
                    <EditableField section="key_dates" field="closing_date" value={editData.key_dates?.closing_date} label="Closing Date" />
                    <EditableField section="key_dates" field="possession_date" value={editData.key_dates?.possession_date} label="Possession Date" />
                  </Section>
                  <Section title="Contingencies">
                    {editData.contingencies?.map((c, i) => (
                      <EditableField key={i} section="contingencies" field={`${i}`} value={`${c.type}: ${c.description} (${c.status})`} label={`#${i + 1}`} />
                    ))}
                  </Section>
                  {editData.extraction_notes && (
                    <Section title="Notes">
                      <p className="text-[#453D30] text-sm leading-relaxed">{editData.extraction_notes}</p>
                    </Section>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="section-card bg-[#FAF9F6] rounded-xl lg:rounded-2xl p-3 lg:p-4 border border-[#F0EDE6]">
      <div className="flex items-center gap-2 mb-2 lg:mb-3">
        <div className="w-1 h-3 lg:h-4 rounded-full bg-gradient-to-b from-[#1C1810] to-[#B5652B]" />
        <h3 className="text-[10px] lg:text-xs font-semibold text-[#453D30] uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );
}
