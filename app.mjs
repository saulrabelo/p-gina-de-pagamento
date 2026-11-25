import {parseAmount, buildPix, recipient} from './pix.mjs';
import QRCode from './vendor/index.mjs';
import levels from './vendor/QRErrorCorrectLevel.mjs';

const el = id => document.getElementById(id);
const format = new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'});
const amount = el('amount');
el('name').textContent = recipient.name;
el('key').textContent = recipient.key;

function makeQr(text) {
  const qr = new QRCode(-1, levels.M);
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 ' + (count+8) + ' ' + (count+8));
  svg.setAttribute('shape-rendering','crispEdges');
  const path = document.createElementNS(ns, 'path');
  const squares = [];
  for (let y=0; y<count; y++)
    for (let x=0; x<count; x++)
      if (qr.isDark(y,x)) squares.push('M'+(x+4)+' '+(y+4)+'h1v1h-1z');
  path.setAttribute('d', squares.join(''));
  path.setAttribute('fill','#000');
  svg.append(path);
  return svg;
}

amount.addEventListener('input', () => {
  amount.removeAttribute('aria-invalid');
  el('error').textContent = '';
});
amount.addEventListener('blur', () => {
  try { amount.value = format.format(parseAmount(amount.value)/100).replace(/^R\$\s*/, ''); }
  catch { /* A validação no envio mantém o valor digitado para correção. */ }
});
el('entry').addEventListener('submit', event => {
  event.preventDefault();
  let cents;
  try { cents = parseAmount(amount.value); }
  catch (error) {
    amount.setAttribute('aria-invalid','true');
    el('error').textContent = error.message;
    amount.focus();
    return;
  }
  try {
    const payload = buildPix(cents);
    el('qr').replaceChildren(makeQr(payload));
    el('code').value = payload;
    el('total').textContent = format.format(cents/100);
    el('entry').hidden = true;
    el('result').hidden = false;
    el('total').focus();
  } catch { el('error').textContent = 'Não foi possível gerar o Pix. Recarregue a página e tente novamente.'; }
});

el('copy').addEventListener('click', async () => {
  const code = el('code');
  const payload = code.value;
  try {
    await navigator.clipboard.writeText(payload);
  } catch {
    if (el('result').hidden || code.value !== payload) return;
    el('details').open = true;
    code.focus();
    code.select();
    code.setSelectionRange(0, payload.length);
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Seleção manual disponível. */ }
    if (!copied) {
      el('status').textContent = 'O código está selecionado. Use a opção Copiar do seu celular.';
      return;
    }
  }
  if (!el('result').hidden && code.value === payload)
    el('status').textContent = 'Código copiado. Cole no aplicativo do seu banco.';
});
el('reset').addEventListener('click', () => {
  el('result').hidden = true;
  el('entry').hidden = false;
  el('details').open = false;
  el('status').textContent = '';
  el('qr').replaceChildren();
  el('code').value = '';
  amount.value = '';
  amount.focus();
});
