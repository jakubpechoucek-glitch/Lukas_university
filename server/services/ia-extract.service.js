// Získání textu ze vstupu (vložený text, Word, PDF, odkaz na Google Doc) a odhad počtu slov podle pravidel IB.
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 200000;

const BIBLIO_RE = /^\s*(references?|reference list|bibliography|works cited|sources|citations?|literatura|zdroje)\s*:?\s*$/i;

function countWords(text) {
  const m = String(text || '').match(/\S+/g);
  return m ? m.length : 0;
}

/**
 * Odhad slov, která se počítají do limitu IB: bez bibliografie, tabulek (řádky s tabulátory)
 * a řádků složených hlavně z čísel. Jde o odhad, ne o oficiální počet.
 */
function estimateCountedWords(text) {
  const lines = String(text || '').split(/\r?\n/);
  let total = 0;
  for (const line of lines) {
    if (BIBLIO_RE.test(line)) break;
    if (line.includes('\t')) continue;
    const tokens = line.match(/\S+/g);
    if (!tokens) continue;
    const numeric = tokens.filter((t) => /^[-+±]?[\d.,:%/()=<>±×*^-]+$/.test(t)).length;
    if (tokens.length >= 3 && numeric / tokens.length > 0.6) continue;
    total += tokens.length;
  }
  return total;
}

function fail(status, message) { throw { status, message }; }

function decodeBase64(b64) {
  if (typeof b64 !== 'string' || !b64) fail(400, 'Soubor je prázdný');
  const buf = Buffer.from(b64, 'base64');
  if (!buf.length) fail(400, 'Soubor je prázdný');
  if (buf.length > MAX_FILE_BYTES) fail(413, 'Soubor je větší než 10 MB');
  return buf;
}

async function fromDocx(buf) {
  const mammoth = require('mammoth');
  try {
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  } catch {
    fail(422, 'Word dokument se nepodařilo přečíst (zkuste uložit znovu jako .docx nebo PDF)');
  }
}

async function fromPdf(buf) {
  const pdfParse = require('pdf-parse/lib/pdf-parse.js');
  try {
    const { text } = await pdfParse(buf);
    return text;
  } catch {
    fail(422, 'PDF se nepodařilo přečíst');
  }
}

async function fromGoogleDoc(url) {
  const m = /^https:\/\/docs\.google\.com\/document\/d\/([A-Za-z0-9_-]{20,})/.exec(String(url || '').trim());
  if (!m) fail(400, 'Zadejte odkaz ve tvaru https://docs.google.com/document/d/…');
  let res;
  try {
    res = await fetch(`https://docs.google.com/document/d/${m[1]}/export?format=txt`, { signal: AbortSignal.timeout(15000) });
  } catch {
    fail(502, 'Google Doc se nepodařilo stáhnout, zkuste to znovu');
  }
  const type = res.headers.get('content-type') || '';
  if (!res.ok || !type.includes('text/plain')) {
    fail(422, 'Dokument je soukromý. Nastavte sdílení „Kdokoli s odkazem“ (čtenář), nebo ho stáhněte jako PDF/Word a nahrajte, nebo vložte text.');
  }
  return (await res.text()).replace(/^﻿/, '');
}

/**
 * input: { source: 'paste'|'file'|'gdoc', text?, file?: {name, mimeType, dataBase64}, url? }
 * Vrací { source, text, pdfBase64?, wordCount, countedWords }.
 */
async function extract(input) {
  const { source } = input || {};
  let text; let src; let pdfBase64 = null;

  if (source === 'paste') {
    text = String(input.text || '');
    src = 'paste';
  } else if (source === 'gdoc') {
    text = await fromGoogleDoc(input.url);
    src = 'gdoc';
  } else if (source === 'file') {
    const file = input.file || {};
    const buf = decodeBase64(file.dataBase64);
    const name = String(file.name || '').toLowerCase();
    if (name.endsWith('.pdf') || file.mimeType === 'application/pdf' || buf.subarray(0, 4).toString() === '%PDF') {
      text = await fromPdf(buf);
      pdfBase64 = buf.toString('base64');
      src = 'pdf';
    } else if (name.endsWith('.docx') || buf.subarray(0, 2).toString() === 'PK') {
      text = await fromDocx(buf);
      src = 'docx';
    } else {
      fail(415, 'Podporované soubory jsou PDF a Word (.docx). Z Google Docs: Soubor → Stáhnout → PDF nebo .docx.');
    }
  } else {
    fail(400, 'Neznámý typ vstupu');
  }

  text = text.replace(/\r\n/g, '\n').trim();
  if (text.length > MAX_TEXT_CHARS) fail(413, 'Text je příliš dlouhý (max. 200 000 znaků)');
  if (countWords(text) < 50 && !pdfBase64) fail(422, 'Text je příliš krátký na vyhodnocení');
  return { source: src, text, pdfBase64, wordCount: countWords(text), countedWords: estimateCountedWords(text) };
}

module.exports = { extract, countWords, estimateCountedWords, MAX_FILE_BYTES };
