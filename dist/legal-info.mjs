import {supportConfig, supportReady} from './support-config.mjs';
const ready = supportReady(supportConfig);
document.querySelectorAll('[data-support-status]').forEach(el => {
  el.textContent = ready ? '任意の単発チップを受け付けています。' : '投げ銭は現在準備中です。受付開始前の案内であり、このページから支払いはできません。運営者情報と返金条件を確認後に受付を開始します。';
});
document.querySelectorAll('[data-operator]').forEach(el => {
  const value = supportConfig.operator[el.dataset.operator];
  el.textContent = value || '受付開始前に掲載します';
});
if (ready) document.querySelector('meta[name="robots"]')?.remove();
