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

// ---- MITRE ATT&CK quick-lookup ----
// Common techniques so typing an ID auto-fills name + tactic.
// (tactic values match OPT.tactic)
export const MITRE_TECHNIQUES = {
  "T1566":     { name: "Phishing", tactic: "Initial Access" },
  "T1566.001": { name: "Spearphishing Attachment", tactic: "Initial Access" },
  "T1566.002": { name: "Spearphishing Link", tactic: "Initial Access" },
  "T1190":     { name: "Exploit Public-Facing Application", tactic: "Initial Access" },
  "T1133":     { name: "External Remote Services", tactic: "Initial Access" },
  "T1078":     { name: "Valid Accounts", tactic: "Persistence" },
  "T1078.004": { name: "Cloud Accounts", tactic: "Persistence" },
  "T1059":     { name: "Command and Scripting Interpreter", tactic: "Execution" },
  "T1059.001": { name: "PowerShell", tactic: "Execution" },
  "T1059.003": { name: "Windows Command Shell", tactic: "Execution" },
  "T1204":     { name: "User Execution", tactic: "Execution" },
  "T1204.002": { name: "Malicious File", tactic: "Execution" },
  "T1053":     { name: "Scheduled Task/Job", tactic: "Persistence" },
  "T1053.005": { name: "Scheduled Task", tactic: "Persistence" },
  "T1547":     { name: "Boot or Logon Autostart Execution", tactic: "Persistence" },
  "T1543":     { name: "Create or Modify System Process", tactic: "Persistence" },
  "T1136":     { name: "Create Account", tactic: "Persistence" },
  "T1068":     { name: "Exploitation for Privilege Escalation", tactic: "Privilege Escalation" },
  "T1548":     { name: "Abuse Elevation Control Mechanism", tactic: "Privilege Escalation" },
  "T1055":     { name: "Process Injection", tactic: "Defense Evasion" },
  "T1027":     { name: "Obfuscated Files or Information", tactic: "Defense Evasion" },
  "T1070":     { name: "Indicator Removal", tactic: "Defense Evasion" },
  "T1112":     { name: "Modify Registry", tactic: "Defense Evasion" },
  "T1562":     { name: "Impair Defenses", tactic: "Defense Evasion" },
  "T1003":     { name: "OS Credential Dumping", tactic: "Credential Access" },
  "T1003.001": { name: "LSASS Memory", tactic: "Credential Access" },
  "T1110":     { name: "Brute Force", tactic: "Credential Access" },
  "T1110.003": { name: "Password Spraying", tactic: "Credential Access" },
  "T1555":     { name: "Credentials from Password Stores", tactic: "Credential Access" },
  "T1056":     { name: "Input Capture", tactic: "Credential Access" },
  "T1087":     { name: "Account Discovery", tactic: "Discovery" },
  "T1082":     { name: "System Information Discovery", tactic: "Discovery" },
  "T1083":     { name: "File and Directory Discovery", tactic: "Discovery" },
  "T1018":     { name: "Remote System Discovery", tactic: "Discovery" },
  "T1046":     { name: "Network Service Discovery", tactic: "Discovery" },
  "T1021":     { name: "Remote Services", tactic: "Lateral Movement" },
  "T1021.001": { name: "Remote Desktop Protocol", tactic: "Lateral Movement" },
  "T1021.002": { name: "SMB/Windows Admin Shares", tactic: "Lateral Movement" },
  "T1570":     { name: "Lateral Tool Transfer", tactic: "Lateral Movement" },
  "T1005":     { name: "Data from Local System", tactic: "Collection" },
  "T1560":     { name: "Archive Collected Data", tactic: "Collection" },
  "T1071":     { name: "Application Layer Protocol", tactic: "Command & Control" },
  "T1071.001": { name: "Web Protocols", tactic: "Command & Control" },
  "T1105":     { name: "Ingress Tool Transfer", tactic: "Command & Control" },
  "T1572":     { name: "Protocol Tunneling", tactic: "Command & Control" },
  "T1041":     { name: "Exfiltration Over C2 Channel", tactic: "Exfiltration" },
  "T1567":     { name: "Exfiltration Over Web Service", tactic: "Exfiltration" },
  "T1048":     { name: "Exfiltration Over Alternative Protocol", tactic: "Exfiltration" },
  "T1486":     { name: "Data Encrypted for Impact", tactic: "Impact" },
  "T1490":     { name: "Inhibit System Recovery", tactic: "Impact" },
  "T1489":     { name: "Service Stop", tactic: "Impact" },
  "T1498":     { name: "Network Denial of Service", tactic: "Impact" },
};

export function lookupMitre(id) {
  if (!id) return null;
  const key = String(id).trim().toUpperCase();
  return MITRE_TECHNIQUES[key] || null;
}
