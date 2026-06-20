"use client";

import { useState } from "react";
import { postJson } from "@/lib/client-api";

type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
type Category = "smart-contract" | "web-app" | "api" | "other";

const SEVERITIES: { value: Severity; label: string }[] = [
  { value: "CRITICAL", label: "Critical" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "smart-contract", label: "Smart contract" },
  { value: "web-app", label: "Web app" },
  { value: "api", label: "API / backend" },
  { value: "other", label: "Other" },
];

export function BugReportForm() {
  const [title, setTitle] = useState("");
  const [severity, setSeverity] = useState<Severity>("MEDIUM");
  const [category, setCategory] = useState<Category>("web-app");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState("");
  const [impact, setImpact] = useState("");
  const [contact, setContact] = useState("");
  const [rewardWallet, setRewardWallet] = useState("");

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const res = await postJson<{ message: string }>("/api/bug-bounty", {
      title,
      severity,
      category,
      description,
      steps: steps || undefined,
      impact: impact || undefined,
      contact: contact || undefined,
      rewardWallet: rewardWallet || undefined,
    });
    setLoading(false);
    if (res.ok) {
      setOk(true);
      setMsg(res.data?.message ?? "Report submitted.");
      setTitle("");
      setDescription("");
      setSteps("");
      setImpact("");
    } else {
      setOk(false);
      setMsg(res.error ?? "Could not submit your report. Please try again.");
    }
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6">
      <div>
        <label className="stat-label">Title</label>
        <input
          className="input mt-1 w-full"
          placeholder="Short summary of the vulnerability"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={140}
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="stat-label">Severity</label>
          <select
            className="input mt-1 w-full"
            value={severity}
            onChange={(e) => setSeverity(e.target.value as Severity)}
          >
            {SEVERITIES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="stat-label">Area</label>
          <select
            className="input mt-1 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="stat-label">Description</label>
        <textarea
          className="input mt-1 w-full"
          rows={4}
          placeholder="What is the bug? What is the root cause?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={8000}
          required
        />
      </div>

      <div>
        <label className="stat-label">Steps to reproduce</label>
        <textarea
          className="input mt-1 w-full"
          rows={3}
          placeholder="1. … 2. … 3. … (include URLs, payloads, accounts)"
          value={steps}
          onChange={(e) => setSteps(e.target.value)}
          maxLength={8000}
        />
      </div>

      <div>
        <label className="stat-label">Impact</label>
        <textarea
          className="input mt-1 w-full"
          rows={2}
          placeholder="What can an attacker achieve? Who is affected?"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
          maxLength={4000}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="stat-label">Contact</label>
          <input
            className="input mt-1 w-full"
            placeholder="Email, Telegram or X handle"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={200}
          />
        </div>
        <div>
          <label className="stat-label">Reward wallet (BNB Chain)</label>
          <input
            className="input mt-1 w-full font-mono"
            placeholder="0x… (optional)"
            value={rewardWallet}
            onChange={(e) => setRewardWallet(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Submitting…" : "Submit report"}
        </button>
        {msg && (
          <p className={`text-sm ${ok ? "text-emerald-400" : "text-rose-400"}`}>
            {msg}
          </p>
        )}
      </div>
      <p className="text-xs text-cream-dim">
        By submitting you agree to the program rules and responsible disclosure
        policy below. Do not include other people&apos;s personal data.
      </p>
    </form>
  );
}
