export const recipient = Object.freeze({
  name: 'Saul Rabelo Filho',
  key: 'saulrabelo@gmail.com',
  city: 'VIAMAO'
});

export function parseAmount(raw) {
  // Mantém centavos inteiros desde a entrada até a serialização.
  const value = String(raw).trim().replace(/^R\$\s*/, '');
  const match = /^(\d{1,10}|[1-9]\d{0,2}(?:\.\d{3}){1,3})(?:,(\d{1,2}))?$/.exec(value);
  if (!match) throw new Error('Use reais e vírgula para os centavos. Exemplo: 24,50.');
  const cents = Number(match[1].replaceAll('.', '')) * 100 + Number((match[2] || '').padEnd(2, '0'));
  checkCents(cents);
  return cents;
}

function checkCents(cents) {
  if (!Number.isSafeInteger(cents) || cents < 1 || cents > 999999999999)
    throw new Error('Informe um valor entre R$ 0,01 e R$ 9.999.999.999,99.');
}

export function decimal(cents) {
  checkCents(cents);
  return Math.floor(cents / 100) + '.' + String(cents % 100).padStart(2, '0');
}

export function crc16(text) {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let bit = 0; bit < 8; bit++)
      crc = ((crc << 1) ^ ((crc & 0x8000) ? 0x1021 : 0)) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(tag, value) {
  const size = new TextEncoder().encode(value).length;
  if (size > 99) throw new Error('Campo Pix muito longo.');
  return tag + String(size).padStart(2, '0') + value;
}

export function buildPix(cents) {
  const account = tlv('00', 'br.gov.bcb.pix') + tlv('01', recipient.key);
  const body = tlv('00', '01') + tlv('26', account) + tlv('52', '0000') +
    tlv('53', '986') + tlv('54', decimal(cents)) + tlv('58', 'BR') +
    tlv('59', recipient.name) + tlv('60', recipient.city) +
    tlv('62', tlv('05', '***')) + '6304';
  return body + crc16(body);
}
