import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'June 2, 2026';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft via-white to-brand-soft py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8 sm:p-12">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-brand-soft rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
        </div>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            This Privacy Policy explains how <strong>Luxury Listings Corp.</strong> ("we", "us", or "our")
            collects, uses, and protects your information when you use the SMM Luxury Listings portal at{' '}
            <a href="https://smmluxurylistings.com" className="text-brand hover:underline">smmluxurylistings.com</a>{' '}
            (the "Service").
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Information We Collect</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Account information.</strong> When you sign in with Google, we receive your name,
                email address, and profile picture from your Google account. We do not receive or store
                your Google password.
              </li>
              <li>
                <strong>Content you create.</strong> Tasks, client records, calendar entries, messages,
                files, and other content you add while using the Service.
              </li>
              <li>
                <strong>Usage data.</strong> Basic technical information such as log data, device/browser
                type, and the pages you visit, used to operate and improve the Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1">
              <li>To authenticate you and provide access to the Service.</li>
              <li>To operate, maintain, and improve the features of the Service.</li>
              <li>To communicate with you about your account, support requests, and service updates.</li>
              <li>To keep the Service secure and prevent abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. How We Share Information</h2>
            <p>
              We do <strong>not</strong> sell your personal information. We share information only with the
              service providers that help us run the Service, including:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Google</strong> — for authentication (Sign in with Google).</li>
              <li><strong>Supabase</strong> — for database, authentication, and storage.</li>
              <li>Hosting and infrastructure providers used to deliver the Service.</li>
            </ul>
            <p>
              We may also disclose information if required by law or to protect our legal rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Google User Data</h2>
            <p>
              Our use and transfer of information received from Google APIs adheres to the{' '}
              <a
                href="https://developers.google.com/terms/api-services-user-data-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline"
              >
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We only request the minimum Google account
              information needed to identify you and create your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Data Retention &amp; Security</h2>
            <p>
              We retain your information for as long as your account is active or as needed to provide the
              Service. We use industry-standard safeguards to protect your data, though no method of
              transmission or storage is completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal information by
              contacting us at the email below. Because access to the portal is managed by Luxury Listings
              Corp., account removal requests are processed by our team.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. When we do, we will revise the "Last
              updated" date at the top of this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Contact Us</h2>
            <p>
              Luxury Listings Corp.<br />
              Duncan, British Columbia, Canada<br />
              <a href="mailto:jrsschroeder@gmail.com" className="text-brand hover:underline">
                jrsschroeder@gmail.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 text-sm text-gray-500">
          See also our{' '}
          <Link to="/terms-of-service" className="text-brand hover:underline">Terms of Service</Link>.
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
