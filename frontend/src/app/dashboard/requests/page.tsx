export default function RequestsPage() {
  "use client";
  let requests = [];
  try {
    requests = JSON.parse(
      typeof window !== "undefined"
        ? localStorage.getItem("reasonsforall_requests") || "[]"
        : "[]",
    );
  } catch (e) {
    requests = [];
  }

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <h1 className="text-2xl font-bold mb-4">Submitted Requests</h1>
      <p className="text-sm text-slate-400 mb-6">
        Requests you have submitted (stored locally in your browser).
      </p>

      {requests.length === 0 ? (
        <div className="p-6 bg-slate-900 rounded border border-white/6 text-slate-400">
          No requests submitted yet. Use{" "}
          <a className="text-violet-400" href="/dashboard/contact">
            Contact
          </a>{" "}
          to create one.
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r: any) => (
            <div
              key={r.id}
              className="p-4 bg-slate-900 rounded border border-white/6"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">{r.email}</div>
                <div className="text-xs text-slate-500">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-slate-300 mb-2">{r.message}</div>
              <div className="text-xs text-slate-500">Status: {r.status}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
