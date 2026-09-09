// Public configuration only. Never put Stripe API keys or bank details here.
export const supportConfig = {
  enabled: true,
  providerApproved: true,
  disclosuresReviewed: true,
  operator: {name: '伊藤誠也', address: '請求があった場合には速やかに開示いたします。メールでお問い合わせください。', phone: '請求があった場合には速やかに開示いたします。メールでお問い合わせください。', email: 'djmaajtj@gmail.com'},
  prices: [
    {amount: 300, url: 'https://buy.stripe.com/aFaaEY1m46yv1LUgYR63K00'},
    {amount: 500, url: 'https://buy.stripe.com/3cIaEY4yg7Cz8ai8sl63K01'},
    {amount: 1000, url: 'https://buy.stripe.com/7sYfZifcU1ebduCaAt63K02'},
  ],
};

export function validPaymentLink(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && u.hostname === 'buy.stripe.com' && !u.port &&
      !u.username && !u.password && /^\/[A-Za-z0-9]+$/.test(u.pathname) && !u.search && !u.hash;
  } catch { return false; }
}

export function supportReady(config) {
  return config.enabled === true && config.providerApproved === true && config.disclosuresReviewed === true &&
    ['name', 'address', 'phone', 'email'].every(k => typeof config.operator?.[k] === 'string' && config.operator[k].trim()) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.operator.email) &&
    config.prices?.length === 3 && [300, 500, 1000].every(amount =>
      config.prices.some(p => p.amount === amount && validPaymentLink(p.url))) &&
    new Set(config.prices.map(p => p.url)).size === 3;
}

export function localSupportPreview(location) {
  return ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) &&
    new URLSearchParams(location.search).get('support-preview') === '1';
}
