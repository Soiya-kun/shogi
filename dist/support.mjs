import {supportConfig, supportReady, localSupportPreview} from './support-config.mjs';
import {SupportPrompt} from './support-prompt.mjs';
import {language, t} from './i18n.js';

export function createSupport({controller, saved, busy, save}) {
  const preview = localSupportPreview(location);
  const ready = supportReady(supportConfig);
  const enabled = ready || preview;
  let runtimeId = controller.gameId;
  let matchId = typeof saved?.matchId === 'string' ? saved.matchId : crypto.randomUUID();
  const prompt = new SupportPrompt({matchId, ended: controller.match.end, shown: saved?.shown === true});
  let timer = null, previousFocus = null;
  const dialog = document.createElement('dialog');
  dialog.id = 'support-dialog';
  dialog.setAttribute('aria-labelledby', 'support-title');
  dialog.setAttribute('aria-describedby', 'support-description');
  dialog.innerHTML = `<button type="button" class="support-close" id="support-close">×</button>
    <p class="support-eyebrow">THANK YOU FOR PLAYING</p><h2 id="support-title"></h2>
    <p id="support-result"></p><p id="support-description"></p><p id="support-note"></p>
    <fieldset id="support-amounts"><legend></legend>${supportConfig.prices.map(p => `<label><input type="radio" name="support-amount" value="${p.amount}"><span>¥${p.amount.toLocaleString('en-US')}</span></label>`).join('')}</fieldset>
    <p id="support-preview-note" role="status" hidden></p><a id="support-pay" class="support-pay" target="_blank" rel="noopener noreferrer" aria-disabled="true"></a>
    <button type="button" id="support-dismiss" autofocus></button><nav class="support-legal"><a href="legal.html" target="_blank" rel="noopener"></a><a href="privacy.html" target="_blank" rel="noopener"></a><a href="support-terms.html" target="_blank" rel="noopener"></a></nav>`;
  document.body.append(dialog);
  const q = selector => dialog.querySelector(selector);
  const settingsButton = document.createElement('button');
  settingsButton.type = 'button'; settingsButton.id = 'open-support'; settingsButton.hidden = !enabled;
  document.querySelector('#settings-dialog').append(settingsButton);
  const endButton = document.createElement('button');
  endButton.type = 'button'; endButton.id = 'end-support'; endButton.hidden = true;
  document.querySelector('#status-panel').append(endButton);
  const text = (ja, en) => language === 'en' ? en : ja;

  function localize() {
    settingsButton.textContent = endButton.textContent = text('ゲームを応援する', 'Support the game');
    q('#support-title').textContent = controller.match.end ? text('対局おつかれさまでした！', 'Thanks for playing!') : text('将棋バトルを応援する', 'Support Shogi Battle');
    q('#support-result').textContent = t(controller.match.end || '');
    q('#support-result').hidden = !controller.match.end;
    q('#support-description').textContent = text('将棋バトルを楽しんでいただけたら、投げ銭で開発を応援してもらえるとうれしいです。', 'Enjoyed Shogi Battle? An optional tip helps us keep developing the game.');
    q('#support-note').textContent = text('今回限りのお支払いです。応援の有無にかかわらず、すべてのゲーム機能を利用できます。', 'A one-time payment. All game features remain free, whether or not you tip.');
    q('legend').textContent = text('応援する金額', 'Choose an amount');
    q('#support-close').setAttribute('aria-label', text('閉じる', 'Close'));
    q('#support-dismiss').textContent = text('今回は閉じる', 'Maybe later');
    q('#support-preview-note').hidden = !preview;
    q('#support-preview-note').textContent = text('表示確認用です。決済は行われません。', 'Preview only. No payment will be made.');
    const labels = [text('特定商取引法に基づく表記', 'Commercial disclosure'), text('プライバシー', 'Privacy'), text('応援・返金について', 'Tips and refunds')];
    q('.support-legal').querySelectorAll('a').forEach((a, i) => a.textContent = labels[i]);
    updatePayment();
  }
  function updatePayment() {
    const amount = Number(q('input:checked')?.value);
    const price = supportConfig.prices.find(p => p.amount === amount);
    const a = q('#support-pay');
    const active = ready && !preview && !!price;
    a.textContent = price ? text(`${amount.toLocaleString('ja-JP')}円で応援する（決済ページへ）`, `Tip ¥${amount.toLocaleString('en-US')} (checkout)`) : text('金額を選んでください', 'Choose an amount');
    a.setAttribute('aria-disabled', String(!active));
    if (active) a.href = price.url; else a.removeAttribute('href');
  }
  function open() {
    if (!enabled || dialog.open || document.querySelector('dialog[open]')) return false;
    previousFocus = document.activeElement;
    dialog.querySelectorAll('input').forEach(input => input.checked = false);
    localize(); dialog.showModal();
    if (controller.match.end) { prompt.markShown(); save(); }
    return true;
  }
  function close() { dialog.close(); }
  q('#support-close').onclick = q('#support-dismiss').onclick = close;
  dialog.addEventListener('close', () => { if (previousFocus?.isConnected && !previousFocus.closest('dialog:not([open])')) previousFocus.focus(); else document.querySelector('#open-settings').focus(); });
  q('#support-amounts').onchange = updatePayment;
  q('#support-pay').onclick = e => { if (e.currentTarget.getAttribute('aria-disabled') === 'true') e.preventDefault(); };
  settingsButton.onclick = () => { document.querySelector('#settings-dialog').close(); open(); };
  endButton.onclick = open;
  function poll() {
    timer = null;
    prompt.update({matchId, ended: controller.match.end, enabled});
    if (prompt.ready({hidden: document.hidden, modalOpen: !!document.querySelector('dialog[open]'), busy: busy()})) open();
    if (prompt.pending !== null) timer = setTimeout(poll, 200);
  }
  function update() {
    if (runtimeId !== controller.gameId) { runtimeId = controller.gameId; matchId = crypto.randomUUID(); }
    prompt.update({matchId, ended: controller.match.end, enabled});
    if (dialog.open && (!controller.match.end && q('#support-result').textContent)) close();
    endButton.hidden = !enabled || !controller.match.end;
    localize();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (prompt.pending !== null) timer = setTimeout(poll, 200);
  }
  localize();
  return {update, serialize: () => ({matchId, shown: prompt.shown}), destroy() { clearTimeout(timer); dialog.close(); }};
}
