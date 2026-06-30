// ============================================================
// CONFIG — option sets and TheHive mapping tables
// ============================================================
export const OPT = {
  severity: ["Critical", "High", "Medium", "Low", "Informational"],
  status: ["Open", "In Progress", "Contained", "Resolved", "False Positive"],
  assetType: ["Workstation", "Server", "Network Device", "Cloud", "User Account"],
  impact: ["None", "Low", "Medium", "High", "Critical"],
  attackVector: ["Email", "Web", "Network", "Physical", "Insider", "Unknown"],
  tactic: ["Reconnaissance", "Initial Access", "Execution", "Persistence", "Privilege Escalation",
           "Defense Evasion", "Credential Access", "Discovery", "Lateral Movement", "Collection",
           "Command & Control", "Exfiltration", "Impact"],
  iocType: ["IP", "Domain", "Hash MD5", "Hash SHA1", "Hash SHA256", "URL", "Email",
            "File Path", "Registry Key", "User Agent"],
  confidence: ["Low", "Medium", "High"],
  tools: ["TheHive", "Splunk", "Kibana", "Wazuh", "CrowdStrike", "Defender", "QRadar", "Elastic", "SIEM", "Custom"],
  containStatus: ["Planned", "In Progress", "Done"],
  priority: ["Critical", "High", "Medium", "Low"],
  refType: ["CVE", "MITRE", "Article", "Tool", "Other"]
};

// ---- TheHive 5 mapping tables ----

// case.severity is 1..4
export const THEHIVE_SEVERITY = { 1: "Low", 2: "Medium", 3: "High", 4: "Critical" };

// Loose status mapping (TheHive 5 statuses vary by customisation)
export function mapThehiveStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("false")) return "False Positive";
  if (v.includes("progress") || v.includes("inprogress")) return "In Progress";
  if (v.includes("contain")) return "Contained";
  if (v.includes("resolv") || v.includes("closed") || v.includes("true")) return "Resolved";
  if (v.includes("new") || v.includes("open")) return "Open";
  return "Open";
}

// observable.dataType -> our IOC type
export function mapObservableType(dataType, value) {
  const t = String(dataType || "").toLowerCase();
  if (t === "ip" || t === "ipv4" || t === "ipv6") return "IP";
  if (t === "domain" || t === "fqdn" || t === "hostname") return "Domain";
  if (t === "url" || t === "uri") return "URL";
  if (t === "mail" || t === "email" || t === "mail_subject") return "Email";
  if (t === "filename" || t === "file" || t === "filepath") return "File Path";
  if (t === "registry" || t === "regkey") return "Registry Key";
  if (t === "user-agent" || t === "useragent") return "User Agent";
  if (t === "hash" || t === "md5" || t === "sha1" || t === "sha256") {
    const len = String(value || "").replace(/[^a-f0-9]/gi, "").length;
    if (len === 32) return "Hash MD5";
    if (len === 40) return "Hash SHA1";
    if (len === 64) return "Hash SHA256";
    return "Hash SHA256";
  }
  return "Domain";
}

// dataTypes we additionally surface as "affected assets"
export const ASSET_DATATYPES = new Set(["hostname", "fqdn", "ip", "ipv4", "ipv6", "mac"]);
