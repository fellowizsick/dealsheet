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
  const [editing, setEditing] = useState(null); // which section is being edited
  const [editData, setEditData] = useState(null);
  const [error, setError] = useState(null);
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !token) router.push("/login");
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
      if (!res.ok) {
        const detail = (await res.json()).detail || "Extraction failed";
        throw new Error(detail);
      }
      const data = await res.json();
      setResult(data);
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
    <div className="flex justify-between py-1 text-sm items-center group">
      <span className="text-gray-500 capitalize">{label || field.replace(/_/g, " ")}</span>
      {editing === `${section}.${field}` ? (
        <input
          className="text-right border rounded px-2 py-0.5 text-sm w-48 focus:ring-2 focus:ring-blue-500 outline-none"
          value={value ?? ""}
          onChange={(e) => updateField(section, field, e.target.value)}
          onBlur={() => setEditing(null)}
          autoFocus
        />
      ) : (
        <span
          className="text-gray-900 font-medium cursor-pointer hover:bg-blue-50 px-2 rounded"
          onClick={() => setEditing(`${section}.${field}`)}
        >
          {value ?? "—"}
        </span>
      )}
    </div>
  );

  if (authLoading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!token) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b px-6 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-blue-600 text-lg">DealSheet</Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm font-semibold text-blue-600">Extract</Link>
          <Link href="/history" className="text-sm text-gray-600 hover:text-blue-600">History</Link>
          <span className="text-xs text-gray-400">{user?.email}</span>
          <button onClick={() => { logout(); router.push("/login"); }} className="text-sm text-red-500 hover:text-red-700">Logout</button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 lg:p-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Upload + PDF */}
          <div className="w-full lg:w-1/2">
            <h1 className="text-2xl font-bold text-gray-900 mb-1">DealSheet</h1>
            <p className="text-gray-500 text-sm mb-4">Upload a purchase agreement to extract key deal details.</p>

            {!fileUrl ? (
              <div>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center bg-white hover:border-blue-400 transition cursor-pointer"
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <input id="file-input" type="file" accept=".pdf" className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  />
                  <div className="text-5xl mb-3">📄</div>
                  <p className="text-gray-700 font-medium">Drop a PDF here or click to browse</p>
                </div>

                {/* Sample contract button */}
                <div className="mt-4 text-center">
                  <span className="text-xs text-gray-400">No contract handy? </span>
                  <button
                    onClick={async () => {
                      const res = await fetch(`${API}/sample-contract`);
                      const blob = await res.blob();
                      const f = new File([blob], "sample_contract.pdf", { type: "application/pdf" });
                      handleFileSelect(f);
                    }}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    Try with a sample contract →
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b text-sm">
                  <span className="font-medium truncate">{file?.name}</span>
                  <div className="flex gap-2">
                    <button onClick={handleUpload} disabled={loading}
                      className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40"
                    >
                      {loading ? "Extracting..." : "Extract"}
                    </button>
                    {result && (
                      <button onClick={downloadCSV}
                        className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-700"
                      >CSV</button>
                    )}
                    <button onClick={() => handleFileSelect(null)}
                      className="text-gray-400 hover:text-red-500 px-2">✕</button>
                  </div>
                </div>
                <div className="h-[600px]">
                  <iframe src={fileUrl} className="w-full h-full" title="PDF Preview" />
                </div>
              </div>
            )}
          </div>

          {/* Right: Results */}
          <div className="w-full lg:w-1/2">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-4 text-sm">{error}</div>
            )}

            {loading && (
              <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
                <div className="animate-spin text-3xl mb-3">⏳</div>
                <p className="text-gray-500">Analyzing contract...</p>
              </div>
            )}

            {editData && !loading && (
              <div className="bg-white rounded-xl shadow-sm border p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Extracted Data</h2>
                  <div className="flex gap-2">
                    {editing && (
                      <button onClick={() => setEditing(null)}
                        className="text-xs text-blue-600 hover:underline">Done editing</button>
                    )}
                  </div>
                </div>

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
                  <EditableField section="financial_terms" field="purchase_price"
                    value={editData.financial_terms?.purchase_price ? `$${Number(editData.financial_terms.purchase_price).toLocaleString()}` : null}
                    label="Purchase Price" />
                  <EditableField section="financial_terms" field="earnest_money_deposit"
                    value={editData.financial_terms?.earnest_money_deposit ? `$${Number(editData.financial_terms.earnest_money_deposit).toLocaleString()}` : null}
                    label="Earnest Money" />
                  <EditableField section="financial_terms" field="down_payment"
                    value={editData.financial_terms?.down_payment ? `$${Number(editData.financial_terms.down_payment).toLocaleString()}` : null}
                    label="Down Payment" />
                  <EditableField section="financial_terms" field="loan_amount"
                    value={editData.financial_terms?.loan_amount ? `$${Number(editData.financial_terms.loan_amount).toLocaleString()}` : null}
                    label="Loan Amount" />
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
                    <p className="text-gray-700 text-sm">{editData.extraction_notes}</p>
                  </Section>
                )}
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
    <div className="mb-5">
      <h3 className="text-md font-semibold text-gray-800 border-b pb-1 mb-2">{title}</h3>
      {children}
    </div>
  );
}
