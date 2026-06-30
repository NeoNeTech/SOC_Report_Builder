// ============================================================
// TEMPLATES — incident playbooks that pre-fill the report so the
// analyst starts from a skeleton instead of a blank page.
// Scalar fields are filled only if empty; list rows are appended.
// ============================================================
import { state, newId } from "./state.js";

const mitre = (id, name, tactic) => ({ _id: newId(), id, name, tactic });
const contain = (action, status = "Planned") => ({ _id: newId(), action, responsible: "", status });
const reco = (priority, recommendation) => ({ _id: newId(), priority, recommendation, owner: "" });

export const TEMPLATES = [
  {
    id: "phishing",
    name: "Phishing",
    icon: "fish",
    desc: "Credential-harvesting or malicious-attachment email",
    vector: "Email",
    summary: "A phishing email was reported/detected targeting one or more users. Initial analysis covers the lure, the delivery, any payload or credential-harvesting page, and user interaction.",
    mitre: [
      mitre("T1566.001", "Spearphishing Attachment", "Initial Access"),
      mitre("T1204.002", "Malicious File", "Execution"),
      mitre("T1078", "Valid Accounts", "Persistence"),
    ],
    containment: [
      contain("Quarantine/delete the email from all mailboxes"),
      contain("Block sender domain and malicious URLs at the gateway"),
      contain("Force password reset for impacted accounts"),
    ],
    recommendations: [
      reco("High", "Enforce MFA on all accounts exposed to the phishing page"),
      reco("Medium", "Deliver targeted phishing awareness to affected users"),
    ],
  },
  {
    id: "malware",
    name: "Malware / Ransomware",
    icon: "bug",
    desc: "Endpoint malware or ransomware detection",
    vector: "Email",
    summary: "Malware was detected on one or more endpoints. Analysis covers the initial execution, persistence, lateral movement attempts and any data-encryption or destructive impact.",
    mitre: [
      mitre("T1204.002", "Malicious File", "Execution"),
      mitre("T1059.001", "PowerShell", "Execution"),
      mitre("T1055", "Process Injection", "Defense Evasion"),
      mitre("T1486", "Data Encrypted for Impact", "Impact"),
    ],
    containment: [
      contain("Isolate affected endpoints from the network"),
      contain("Block malicious hashes/C2 indicators (EDR + firewall)"),
      contain("Preserve forensic image / memory before remediation"),
    ],
    recommendations: [
      reco("Critical", "Rebuild compromised hosts from a known-good image"),
      reco("High", "Verify and test offline backups for recovery"),
    ],
  },
  {
    id: "bruteforce",
    name: "Brute Force / Account Compromise",
    icon: "key-round",
    desc: "Password spraying, brute force or suspicious logins",
    vector: "Network",
    summary: "Anomalous authentication activity was detected (brute force / password spraying / impossible travel). Analysis covers source IPs, targeted accounts, success/failure patterns and post-access activity.",
    mitre: [
      mitre("T1110", "Brute Force", "Credential Access"),
      mitre("T1110.003", "Password Spraying", "Credential Access"),
      mitre("T1078", "Valid Accounts", "Persistence"),
    ],
    containment: [
      contain("Block offending source IP ranges"),
      contain("Disable / reset compromised accounts"),
      contain("Revoke active sessions and tokens for impacted accounts"),
    ],
    recommendations: [
      reco("High", "Enforce MFA and lockout/throttling policies"),
      reco("Medium", "Tune detection thresholds for spray patterns"),
    ],
  },
  {
    id: "exfiltration",
    name: "Data Exfiltration",
    icon: "database-backup",
    desc: "Suspected data theft / unusual outbound transfer",
    vector: "Network",
    summary: "Suspicious outbound data transfer was detected. Analysis covers the data accessed, the exfiltration channel, volume and destination, and the scope of potentially exposed information.",
    mitre: [
      mitre("T1005", "Data from Local System", "Collection"),
      mitre("T1560", "Archive Collected Data", "Collection"),
      mitre("T1041", "Exfiltration Over C2 Channel", "Exfiltration"),
      mitre("T1567", "Exfiltration Over Web Service", "Exfiltration"),
    ],
    containment: [
      contain("Block destination IPs/domains and exfil channel"),
      contain("Suspend involved accounts / API keys"),
      contain("Preserve proxy, DLP and netflow logs"),
    ],
    recommendations: [
      reco("High", "Assess regulatory/notification obligations for exposed data"),
      reco("Medium", "Deploy/tune DLP rules on the affected data class"),
    ],
  },
];

export function applyTemplate(tpl) {
  if (tpl.vector && !state.technical.vector) state.technical.vector = tpl.vector;
  if (tpl.summary && !state.summary.text.trim()) state.summary.text = tpl.summary;
  if (tpl.mitre) state.technical.mitre.push(...tpl.mitre.map((m) => ({ ...m, _id: newId() })));
  if (tpl.containment) state.remediation.containment.push(...tpl.containment.map((c) => ({ ...c, _id: newId() })));
  if (tpl.recommendations) state.remediation.recommendations.push(...tpl.recommendations.map((r) => ({ ...r, _id: newId() })));
}
