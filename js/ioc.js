// ============================================================
// IOC — extract indicators of compromise from arbitrary text.
// Handles common defanging (1[.]2[.]3[.]4, hxxp://, foo(.)com).
// ============================================================

// Undo common defang notations so the regexes can match.
function refang(text) {
  return String(text || "")
    .replace(/\[\.\]|\(\.\)|\{\.\}|\s\.\s|\[dot\]/gi, ".")
    .replace(/\[:\]/g, ":")
    .replace(/\[@\]|\(at\)|\[at\]/gi, "@")
    .replace(/h\s*x\s*x\s*p/gi, "http")
    .replace(/\[\/\]/g, "/");
}

const RE = {
  sha256: /\b[a-f0-9]{64}\b/gi,
  sha1: /\b[a-f0-9]{40}\b/gi,
  md5: /\b[a-f0-9]{32}\b/gi,
  url: /\bhttps?:\/\/[^\s"'<>)\]]+/gi,
  email: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/gi,
  ipv4: /\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g,
  domain: /\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}\b/gi,
};

// Map a detected kind to the IOC type used in the form (FR).
const TYPE = {
  sha256: "Hash SHA256", sha1: "Hash SHA1", md5: "Hash MD5",
  url: "URL", email: "Email", ipv4: "IP", domain: "Domaine",
};

// File extensions that look like domains but aren't (reduce false positives).
const FILE_TLD = /\.(exe|dll|js|vbs|ps1|bat|cmd|doc|docx|xls|xlsx|pdf|zip|rar|7z|png|jpg|gif|txt|log|sys|tmp|dat|bin)$/i;

/**
 * Extract de-duplicated indicators from a blob of text.
 * @returns {{type:string, value:string}[]}
 */
export function extractIocs(rawText) {
  const text = refang(rawText);
  const found = [];
  const seen = new Set();
  const add = (type, value) => {
    const key = value.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ type, value });
  };

  // Work on a mutable copy: as we consume hashes/urls/emails/ips we blank
  // them out so the broad domain regex doesn't re-match their substrings.
  let work = text;
  const consume = (kind) => {
    const re = RE[kind];
    work = work.replace(re, (m) => {
      add(TYPE[kind], m);
      return " ".repeat(m.length);
    });
  };

  // Order matters: most specific first.
  consume("sha256");
  consume("sha1");
  consume("md5");
  consume("url");
  consume("email");
  consume("ipv4");

  // Domains last, on the remaining text, filtering obvious filenames.
  let m;
  RE.domain.lastIndex = 0;
  while ((m = RE.domain.exec(work)) !== null) {
    const d = m[0];
    if (FILE_TLD.test(d)) continue;
    add(TYPE.domain, d);
  }

  return found;
}
