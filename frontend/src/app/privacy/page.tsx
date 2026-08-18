export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6 text-slate-100 min-h-[80vh] flex flex-col justify-center">
      <h1 className="text-3xl font-extrabold mb-4 bg-gradient-to-r from-white to-violet-400 bg-clip-text text-transparent">Privacy Policy</h1>
      <p className="text-sm text-slate-400 mb-6">
        Effective date: June 8, 2026
      </p>

      <p className="mb-4 text-sm text-slate-300">
        This Privacy Policy explains how <strong>Ralles</strong> ("we", "us", "our") handles database connection metadata and credentials. As an open-source educational project developed for Kaggle, your privacy and data security are core design principles.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">1. Data We Access</h2>
      <ul className="list-disc ml-6 mb-4 text-sm text-slate-300 space-y-2">
        <li>
          <strong>Schema Metadata:</strong> When you connect a database to Ralles, the platform queries only your database's schema metadata (tables, column names, keys, and constraints). We <strong>never</strong> copy, store, or cache row data or query outputs.
        </li>
        <li>
          <strong>Connection Credentials:</strong> Any database connection string you provide is used solely to authenticate and perform introspection. For local development, we recommend passing standard credentials to local databases.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">2. No Billing or Payment Processing</h2>
      <p className="mb-4 text-sm text-slate-300">
        Ralles is fully open-source and free. We do not collect or process credit cards, billing addresses, or payment details. There are no third-party payment processors integrated into this service.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">3. Data Sharing</h2>
      <p className="mb-4 text-sm text-slate-300">
        We do not sell, rent, or distribute your schema information or account metadata to anyone. The project is hosted on Supabase (PostgreSQL) where database configurations are kept secure for your own account session.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2 text-violet-300">4. Contact & Contributions</h2>
      <p className="mb-4 text-sm text-slate-300">
        If you have questions, security concerns, or wish to contribute, please open an issue or pull request directly on our GitHub repository.
      </p>

      <p className="text-xs text-slate-500 mt-8">
        This policy may be updated occasionally. All updates are tracked transparently in the git history of our repository.
      </p>
    </div>
  );
}
