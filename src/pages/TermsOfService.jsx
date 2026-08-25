import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

const LAST_UPDATED = 'June 2, 2026';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-soft via-white to-brand-soft py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg border border-gray-100 p-8 sm:p-12">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to sign in
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-brand-soft rounded-full flex items-center justify-center">
            <FileText className="w-6 h-6 text-brand" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        </div>
        <p className="text-sm text-gray-500 mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-gray max-w-none space-y-6 text-gray-700 leading-relaxed">
          <p>
            These Terms of Service ("Terms") govern your access to and use of the SMM Luxury Listings
            portal at{' '}
            <a href="https://smmluxurylistings.com" className="text-brand hover:underline">smmluxurylistings.com</a>{' '}
            (the "Service"), operated by <strong>Luxury Listings Corp.</strong> ("we", "us", or "our"). By
            accessing or using the Service, you agree to be bound by these Terms.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">1. Eligibility &amp; Accounts</h2>
            <p>
              The Service is provided to authorized team members and clients of Luxury Listings Corp.
              Access is granted and managed by us. You are responsible for maintaining the confidentiality
              of your account and for all activity that occurs under it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">2. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
              <li>Attempt to gain unauthorized access to any part of the Service or its data.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Upload content that infringes the rights of others or is unlawful.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">3. Your Content</h2>
            <p>
              You retain ownership of the content you submit to the Service. You grant us the limited right
              to host, store, and process that content solely to operate and provide the Service to you and
              your organization.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">4. Intellectual Property</h2>
            <p>
              The Service, including its software, design, and branding, is owned by Luxury Listings Corp.
              and is protected by applicable intellectual property laws. These Terms do not grant you any
              right to use our trademarks or branding without our prior written consent.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">5. Privacy</h2>
            <p>
              Your use of the Service is also governed by our{' '}
              <Link to="/privacy-policy" className="text-brand hover:underline">Privacy Policy</Link>,
              which explains how we collect and handle your information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">6. Termination</h2>
            <p>
              We may suspend or terminate your access to the Service at any time if you violate these Terms
              or if access is no longer authorized. You may stop using the Service at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">7. Disclaimer &amp; Limitation of Liability</h2>
            <p>
              The Service is provided "as is" without warranties of any kind. To the maximum extent
              permitted by law, Luxury Listings Corp. will not be liable for any indirect, incidental, or
              consequential damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">8. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the Province of British Columbia and the federal laws
              of Canada applicable therein, without regard to conflict-of-law principles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">9. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. When we do, we will revise the "Last updated"
              date at the top of this page. Continued use of the Service after changes take effect
              constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900">10. Contact Us</h2>
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
          <Link to="/privacy-policy" className="text-brand hover:underline">Privacy Policy</Link>.
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;
