"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // persist to localStorage as a minimal requests store
    const existing = JSON.parse(
      localStorage.getItem("reasonsforall_requests") || "[]",
    );
    existing.unshift({
      id: Date.now(),
      email,
      message,
      status: "submitted",
      created_at: new Date().toISOString(),
    });
    localStorage.setItem("reasonsforall_requests", JSON.stringify(existing));
    router.push("/dashboard/requests");
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold mb-4">Contact & Submit a Request</h1>
      <p className="text-sm text-slate-400 mb-4">
        Submit a request for bulk schema extraction, logical reasoning assistance, or custom
        work. We'll follow up via email.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Your Email
          </label>
          <input
            type="email"
            required
            className="w-full rounded px-3 py-2 bg-slate-900 border border-white/6"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-300 mb-1">
            Message / Request Details
          </label>
          <textarea
            required
            className="w-full rounded px-3 py-2 bg-slate-900 border border-white/6 h-32"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
        <div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-violet-600 text-white font-bold"
          >
            Submit Request
          </button>
        </div>
      </form>
    </div>
  );
}
