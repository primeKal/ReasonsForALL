"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userInitial, setUserInitial] = useState<string>("U");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        setUserInitial(session.user.email[0].toUpperCase());
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });
    // Close dropdown on outside click
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("#user-menu")) setDropdownOpen(false);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard/servers", label: "Servers", icon: "🗄️" },
    { href: "/dashboard/docs", label: "Docs", icon: "📖" },
    { href: "/dashboard/contact", label: "Contact", icon: "✉️" },
    { href: "/dashboard/requests", label: "Requests", icon: "📬" },
  ];

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="min-h-screen flex flex-col selection:bg-violet-500/30 selection:text-white"
      style={{
        background: "#020817",
        color: "#f1f5f9",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/8 blur-[160px] rounded-full pointer-events-none -z-10" />
      <div className="fixed top-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-600/8 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="fixed bottom-10 left-1/3 w-[600px] h-[600px] bg-blue-600/8 blur-[180px] rounded-full pointer-events-none -z-10" />

      {/* Header — identical to landing page */}
      <header
        className="px-6 lg:px-14 h-20 flex items-center justify-between sticky top-0 z-50"
        style={{
          background: "rgba(2,8,23,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
        }}
      >
        {/* Logo */}
        <a
          role="button"
          onClick={async (e) => {
            e.preventDefault();
            const supabase = createClient();
            const {
              data: { session },
            } = await supabase.auth.getSession();
            if (session?.user) router.push("/dashboard/servers");
            else router.push("/");
          }}
          className="flex items-center gap-2.5 group flex-shrink-0 cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center font-extrabold text-white shadow-lg shadow-violet-500/20 group-hover:scale-105 transition-transform">
            R
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-black tracking-tight bg-gradient-to-r from-white via-slate-200 to-violet-400 bg-clip-text text-transparent">
              Ralles
            </span>
            <span className="text-[9px] text-violet-400 font-bold uppercase tracking-widest -mt-1">
              Reasons for Alles
            </span>
          </div>
        </a>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                color: isActive(link.href) ? "#c4b5fd" : "#94a3b8",
                background: isActive(link.href)
                  ? "rgba(124,58,237,0.12)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive(link.href))
                  (e.currentTarget as HTMLElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={(e) => {
                if (!isActive(link.href))
                  (e.currentTarget as HTMLElement).style.color = "#94a3b8";
              }}
            >
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right section */}
        <div className="flex items-center gap-3 flex-shrink-0" id="user-menu">
          {/* User avatar + dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen((o) => !o)}
              className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl transition-all group"
              style={{
                background: dropdownOpen
                  ? "rgba(124,58,237,0.15)"
                  : "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {/* Avatar */}
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg,#7c3aed,#6366f1)",
                }}
              >
                {userInitial}
              </div>
              <span className="text-sm text-slate-300 hidden sm:block max-w-[120px] truncate">
                {userEmail}
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="text-slate-500 transition-transform"
                style={{ transform: dropdownOpen ? "rotate(180deg)" : "none" }}
              >
                <path
                  d="M2 4l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {dropdownOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-52 rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(15,23,42,0.97)",
                  border: "1px solid rgba(99,102,241,0.25)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  backdropFilter: "blur(16px)",
                }}
              >
                {/* User info header */}
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-xs font-semibold text-slate-300 truncate">
                    {userEmail}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Ralles Account
                  </p>
                </div>

                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  {[
                    {
                      icon: "⚙️",
                      label: "My Account",
                      action: () => {
                        router.push("/dashboard/profile");
                        setDropdownOpen(false);
                      },
                    },
                    {
                      icon: "🗄️",
                      label: "Servers",
                      action: () => {
                        router.push("/dashboard/servers");
                        setDropdownOpen(false);
                      },
                    },
                    {
                      icon: "📖",
                      label: "Documentation",
                      action: () => {
                        router.push("/dashboard/docs");
                        setDropdownOpen(false);
                      },
                    },
                  ].map((item) => (
                    <button
                      key={item.label}
                      onClick={item.action}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-slate-300 hover:text-white hover:bg-white/6 transition-all text-left"
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="p-1.5 border-t border-white/5">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all text-left"
                  >
                    <span>🚪</span> Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 relative z-10">{children}</main>

      {/* Footer */}
      <footer
        className="px-6 lg:px-14 py-5 flex items-center justify-between text-xs text-slate-600"
        style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
      >
        <span>© 2026 Ralles</span>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-slate-400 transition-colors">
            Landing Page
          </Link>
          <Link
            href="/dashboard/docs"
            className="hover:text-slate-400 transition-colors"
          >
            Docs
          </Link>
          <Link
            href="/privacy"
            className="hover:text-slate-400 transition-colors"
          >
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
