/**
 * Build Gmail compose URL (compose view only).
 * @param {string} to - Recipient email
 * @param {{ subject?: string, body?: string }} [opts]
 */
export function getGmailComposeUrl(to, opts = {}) {
  const params = new URLSearchParams({ view: 'cm', fs: '1' });
  if (to) params.set('to', to);
  if (opts.subject) params.set('su', opts.subject);
  if (opts.body) params.set('body', opts.body);
  return `https://mail.google.com/mail/?${params.toString()}`;
}

export function openEmailInGmail(to, opts = {}) {
  window.open(getGmailComposeUrl(to, opts), '_blank', 'noopener,noreferrer');
}

/**
 * Open Gmail inbox in one tab and compose (to, subject, body) in another.
 * Use for "email this contact" so the user gets full Gmail + pre-filled compose.
 */
export function openGmailWithComposeTo(to, opts = {}) {
  window.open('https://mail.google.com/mail/', '_blank', 'noopener,noreferrer');
  window.open(getGmailComposeUrl(to, opts), '_blank', 'noopener,noreferrer');
}
