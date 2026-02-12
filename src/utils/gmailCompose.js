/**
 * Build Gmail compose URL and open in new tab (so mailto: opens in Gmail).
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
