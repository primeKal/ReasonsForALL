export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto py-12 px-6">
      <h1 className="text-3xl font-extrabold mb-4">Privacy Policy</h1>
      <p className="text-sm text-slate-700 mb-4">
        Effective date: June 8, 2026
      </p>

      <p className="mb-4">
        Ralles Inc. ("we", "us", "our") respects your privacy. This Privacy
        Policy describes the types of information we collect, how we use it, and
        the choices you have regarding your data when using our services (the
        "Service"). This policy applies to personal data collected in connection
        with our website, applications, and related services.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2">1. Information We Collect</h2>
      <ul className="list-disc ml-6 mb-4 text-sm text-slate-700">
        <li>
          Account information: name, email, company name, and credentials when
          you create an account.
        </li>
        <li>
          Usage data: logs, timestamps, feature usage and diagnostic data to
          help us operate and improve the Service.
        </li>
        <li>
          Content: any content you provide (for example, files, configuration or
          database connection data) to use the Service.
        </li>
        <li>
          Payment & billing: when applicable, payment details processed by our
          payment provider(s).
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">
        2. How We Use Your Information
      </h2>
      <p className="mb-4 text-sm text-slate-700">We use personal data to:</p>
      <ul className="list-disc ml-6 mb-4 text-sm text-slate-700">
        <li>Provide, maintain, and improve our Service.</li>
        <li>
          Authenticate and manage accounts, and communicate important notices.
        </li>
        <li>Detect, prevent, and address technical issues, fraud, or abuse.</li>
        <li>Comply with legal obligations.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">
        3. Data Sharing and Disclosure
      </h2>
      <p className="mb-4 text-sm text-slate-700">We may share data with:</p>
      <ul className="list-disc ml-6 mb-4 text-sm text-slate-700">
        <li>
          Service providers who perform services on our behalf (e.g., hosting,
          email, analytics).
        </li>
        <li>
          Third-party integrations you enable (e.g., identity providers,
          storage, and payment processors).
        </li>
        <li>
          When required by law or to respond to legal requests, protect our
          rights, or address fraud.
        </li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">4. Your Choices</h2>
      <p className="mb-4 text-sm text-slate-700">You can:</p>
      <ul className="list-disc ml-6 mb-4 text-sm text-slate-700">
        <li>
          Access, update or delete your account information through your account
          settings or by contacting us.
        </li>
        <li>Opt out of non-essential communications.</li>
        <li>Control third-party integrations from your account settings.</li>
      </ul>

      <h2 className="text-xl font-bold mt-6 mb-2">5. Data Security</h2>
      <p className="mb-4 text-sm text-slate-700">
        We implement reasonable technical and organizational measures to protect
        personal data. No system is perfectly secure; please contact us if you
        suspect a security issue.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2">6. Data Retention</h2>
      <p className="mb-4 text-sm text-slate-700">
        We retain personal data as long as needed to provide the Service and for
        legitimate business purposes, including to comply with legal obligations
        and resolve disputes.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2">7. Children</h2>
      <p className="mb-4 text-sm text-slate-700">
        Our Service is not intended for children under 13. We do not knowingly
        collect personal data from children under 13.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2">
        8. International Transfers
      </h2>
      <p className="mb-4 text-sm text-slate-700">
        We may transfer data across borders and will protect it in accordance
        with this policy and applicable law.
      </p>

      <h2 className="text-xl font-bold mt-6 mb-2">9. Contact</h2>
      <p className="mb-4 text-sm text-slate-700">
        If you have questions about this Privacy Policy, contact us at
        privacy@ralles.example
      </p>

      <p className="text-xs text-slate-500 mt-8">
        This Privacy Policy may be updated from time to time. We will post
        changes on this page.
      </p>
    </div>
  );
}
