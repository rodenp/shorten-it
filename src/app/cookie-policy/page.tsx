import React from 'react';
// Optional: If you want to provide a button to open the preference center from this page
// import CookiePreferenceManager from '@/components/settings/CookiePreferenceManager'; // Assuming a wrapper component for the modal

const CookiePolicyPage = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.6' }}>
      <h1>Cookie Policy</h1>
      <p>Last Updated: [Date of Last Update - e.g., YYYY-MM-DD]</p>

      <section style={{ marginBottom: '30px' }}>
        <h2>1. What Are Cookies?</h2>
        <p>
          Cookies are small text files that are stored on your computer or mobile device when you visit a website.
          They are widely used to make websites work, or work more efficiently, as well as to provide information
          to the owners of the site. Cookies allow websites to remember your actions and preferences (such as login,
          language, font size, and other display preferences) over a period of time, so you don&apos;t have to keep
          re-entering them whenever you come back to the site or browse from one page to another.
        </p>
        <p>
          We may also use other similar technologies like local storage or pixel tags for similar purposes.
          For simplicity, we refer to all these technologies as "cookies" in this policy.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>2. How We Use Cookies</h2>
        <p>
          We use cookies for several purposes, including:
        </p>
        <ul>
          <li><strong>Essential Cookies:</strong> To operate the core functionalities of our website, such as user authentication, session management, and security. These are strictly necessary and do not require your consent.</li>
          <li><strong>Analytics Cookies:</strong> To understand how visitors interact with our website, such as which pages are visited most often and if users encounter any errors. This helps us improve the performance and usability of our site. These cookies are only used if you provide your consent.</li>
          <li><strong>Functional Cookies:</strong> To remember choices you make (like your username or UI preferences) and provide enhanced, more personal features. These cookies are only used if you provide your consent.</li>
          {/* <li><strong>Marketing Cookies:</strong> [To be added if marketing cookies are introduced] To display advertisements relevant to you and your interests.</li> */}
        </ul>
      </section>
      
      <section style={{ marginBottom: '30px' }}>
        <h2>3. Cookies We Use</h2>
        <p>
          Below is a list of the specific cookies that may be used on our Service. Please note that this list will be
          updated periodically as we integrate or change cookie usage.
        </p>
        <p><strong>[Placeholder: A detailed table or list of cookies will be provided here after a full audit. This list will include:]</strong></p>
        <ul>
          <li>Cookie Name</li>
          <li>Provider (e.g., Our Website, Google Analytics)</li>
          <li>Purpose</li>
          <li>Duration (e.g., Session, 1 year)</li>
          <li>Type (e.g., HTTP Cookie, Local Storage item)</li>
        </ul>
        <p>For example:</p>
        <ul>
            <li>`cookie_consent_preferences`: Our Website, Stores your cookie consent choices, 180 days, HTTP Cookie.</li>
            <li>`next-auth.session-token` (or similar): Our Website, Essential for user session management, Session or persistent depending on "Remember me", HTTP Cookie.</li>
            <li>`_ga`, `_gid`: Google Analytics, Used to distinguish users and throttle request rate for analytics purposes, 2 years / 24 hours, HTTP Cookie (if analytics consented).</li>
        </ul>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>4. Managing Your Cookie Preferences</h2>
        <p>
          You have control over your cookie preferences. You can manage your consents at any time using our Cookie Preference Center.
        </p>
        {/* 
          If you create a wrapper component to launch CookiePreferenceCenter modal:
          <CookiePreferenceManager /> 
          Otherwise, instruct users to find it, e.g., via a footer link.
        */}
        <p>
          To open the Cookie Preference Center, please click on the "Cookie Settings" or "Manage Cookies" link typically found in the footer of our website.
        </p>
        <p>
          Additionally, most web browsers allow some control of most cookies through the browser settings. To find out more about cookies,
          including how to see what cookies have been set and how to manage and delete them, visit <a href="https://www.aboutcookies.org" target="_blank" rel="noopener noreferrer">www.aboutcookies.org</a> or <a href="https://www.allaboutcookies.org" target="_blank" rel="noopener noreferrer">www.allaboutcookies.org</a>.
        </p>
        <p>
          Please note that if you choose to block all cookies (including essential cookies) through your browser settings,
          you may not be able to access all or parts of our Service.
        </p>
      </section>

      <section style={{ marginBottom: '30px' }}>
        <h2>5. Changes to This Cookie Policy</h2>
        <p>
          We may update this Cookie Policy from time to time to reflect changes in our practices or for other operational,
          legal, or regulatory reasons. We will notify you of any material changes by posting the new Cookie Policy on this page
          and updating the "Last Updated" date.
        </p>
      </section>

      <section>
        <h2>6. Contact Us</h2>
        <p>
          If you have any questions about our use of cookies or this Cookie Policy, please contact us at:
          [Link to your Privacy Policy contact email or general contact page]
        </p>
      </section>
    </div>
  );
};

export default CookiePolicyPage;
