export const metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 text-slate-100 min-h-[80vh] flex flex-col justify-center">
      <h1 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-white to-violet-400 bg-clip-text text-transparent">Terms of Service</h1>
      <p className="text-sm text-slate-400 mb-6">
        Effective date: June 8, 2026
      </p>

      <p className="mb-4 text-sm text-slate-300">
        These Terms of Service ("Terms") govern your access to and use of{" "}
        <strong>Ralles</strong> ("Ralles", "we", "us", or "our"), an open-source guardrail platform developed for educational purposes and Kaggle submissions. By using the platform, you agree to these Terms.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">1. Using the Service</h2>
      <p className="mb-4 text-sm text-slate-300">
        You may use Ralles strictly for lawful purposes. Since this is an open-source educational project, we make no guarantees about uptime, database persistence, or service availability.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">2. No Billing or Subscriptions</h2>
      <p className="mb-4 text-sm text-slate-300">
        Ralles is completely free and open-source. There are no billing systems, subscription fees, or paid tiers. Any premium flags in the codebase are fully unlocked for all users.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">3. Intellectual Property and Open Source</h2>
      <p className="mb-4 text-sm text-slate-300">
        Ralles is released under the open-source MIT License. You are free to fork, modify, and distribute the project in accordance with the license. You retain full ownership of any database connection strings or schemas you use.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">4. Disclaimers and Limitation of Liability</h2>
      <p className="mb-4 text-sm text-slate-300">
        THE SERVICE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES, OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT, OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">5. Governing Law</h2>
      <p className="mb-4 text-sm text-slate-300">
        As an open-source project created by a student, any disputes or feedback are welcomed directly on our GitHub repository.
      </p>

      <p className="text-xs text-slate-500 mt-8">
        These Terms may be updated occasionally. All updates will be pushed directly to the open-source repository.
      </p>
    </div>
  );
}
