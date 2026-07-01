// ============================================================
// CONFIG — jeux d'options (FR) + tables de correspondance
// Les libellés affichés sont en français ; les "niveaux" canoniques
// (critical/high/…) découplent l'affichage des classes CSS et couleurs.
// ============================================================
export const OPT = {
  severity: ["Critique", "Élevée", "Moyenne", "Faible", "Informationnelle"],
  status: ["Ouvert", "En cours", "Contenu", "Résolu", "Faux positif"],
  assetType: ["Poste de travail", "Serveur", "Équipement réseau", "Cloud", "Compte utilisateur"],
  impact: ["Aucun", "Faible", "Moyen", "Élevé", "Critique"],
  attackVector: ["Email", "Web", "Réseau", "Physique", "Interne", "Inconnu"],
  tactic: ["Reconnaissance", "Accès initial", "Exécution", "Persistance", "Élévation de privilèges",
           "Évasion de défense", "Accès aux identifiants", "Découverte", "Mouvement latéral", "Collecte",
           "Commande et contrôle", "Exfiltration", "Impact"],
  iocType: ["IP", "Domaine", "Hash MD5", "Hash SHA1", "Hash SHA256", "URL", "Email",
            "Chemin de fichier", "Clé de registre", "User Agent"],
  confidence: ["Faible", "Moyenne", "Élevée"],
  tools: ["TheHive", "Splunk", "Kibana", "Wazuh", "CrowdStrike", "Defender", "QRadar", "Elastic", "SIEM", "Autre"],
  containStatus: ["Planifié", "En cours", "Terminé"],
  priority: ["Critique", "Élevée", "Moyenne", "Faible"],
  refType: ["CVE", "MITRE", "Article", "Outil", "Autre"],
  classification: ["Non Protégé", "Diffusion Restreinte", "Secret"],
  tlp: ["TLP:CLEAR", "TLP:GREEN", "TLP:AMBER", "TLP:AMBER+STRICT", "TLP:RED"],
};

// ---- niveaux canoniques (pour classes CSS / couleurs, insensibles à la langue) ----
export const SEVERITY_LEVEL = { "Critique": "critical", "Élevée": "high", "Moyenne": "medium", "Faible": "low", "Informationnelle": "info" };
export const IMPACT_LEVEL = { "Aucun": "none", "Faible": "low", "Moyen": "medium", "Élevé": "high", "Critique": "critical" };
export const CONFIDENCE_LEVEL = { "Faible": "low", "Moyenne": "medium", "Élevée": "high" };
export const CONTAIN_STATUS_KEY = { "Planifié": "planned", "En cours": "inprogress", "Terminé": "done" };
export const PRIORITY_LEVEL = { "Critique": "critical", "Élevée": "high", "Moyenne": "medium", "Faible": "low" };
export const TLP_LEVEL = { "TLP:CLEAR": "clear", "TLP:GREEN": "green", "TLP:AMBER": "amber", "TLP:AMBER+STRICT": "amber", "TLP:RED": "red" };
export const CLASSIFICATION_LEVEL = { "Non Protégé": "np", "Diffusion Restreinte": "dr", "Secret": "secret" };

// ---- correspondances TheHive 5 ----
export const THEHIVE_SEVERITY = { 1: "Faible", 2: "Moyenne", 3: "Élevée", 4: "Critique" };

export function mapThehiveStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("false")) return "Faux positif";
  if (v.includes("progress") || v.includes("inprogress")) return "En cours";
  if (v.includes("contain")) return "Contenu";
  if (v.includes("resolv") || v.includes("closed") || v.includes("true")) return "Résolu";
  if (v.includes("new") || v.includes("open")) return "Ouvert";
  return "Ouvert";
}

export function mapObservableType(dataType, value) {
  const t = String(dataType || "").toLowerCase();
  if (t === "ip" || t === "ipv4" || t === "ipv6") return "IP";
  if (t === "domain" || t === "fqdn" || t === "hostname") return "Domaine";
  if (t === "url" || t === "uri") return "URL";
  if (t === "mail" || t === "email" || t === "mail_subject") return "Email";
  if (t === "filename" || t === "file" || t === "filepath") return "Chemin de fichier";
  if (t === "registry" || t === "regkey") return "Clé de registre";
  if (t === "user-agent" || t === "useragent") return "User Agent";
  if (t === "hash" || t === "md5" || t === "sha1" || t === "sha256") {
    const len = String(value || "").replace(/[^a-f0-9]/gi, "").length;
    if (len === 32) return "Hash MD5";
    if (len === 40) return "Hash SHA1";
    return "Hash SHA256";
  }
  return "Domaine";
}

export const ASSET_DATATYPES = new Set(["hostname", "fqdn", "ip", "ipv4", "ipv6", "mac"]);

// ---- tactiques MITRE : normalisé (EN ou FR) -> libellé FR ----
const _tacticSrc = {
  reconnaissance: "Reconnaissance",
  "resource development": "Développement de ressources",
  "initial access": "Accès initial",
  execution: "Exécution",
  persistence: "Persistance",
  "privilege escalation": "Élévation de privilèges",
  "defense evasion": "Évasion de défense",
  "credential access": "Accès aux identifiants",
  discovery: "Découverte",
  "lateral movement": "Mouvement latéral",
  collection: "Collecte",
  "command and control": "Commande et contrôle",
  exfiltration: "Exfiltration",
  impact: "Impact",
};
const _flat = (s) => String(s || "").toLowerCase().replace(/[^a-z]/g, "");
export const TACTIC_LOOKUP = {};
for (const [en, fr] of Object.entries(_tacticSrc)) { TACTIC_LOOKUP[_flat(en)] = fr; TACTIC_LOOKUP[_flat(fr)] = fr; }
export function normTactic(v) {
  if (!v) return "";
  const raw = Array.isArray(v) ? v[0] : v;
  return TACTIC_LOOKUP[_flat(raw)] || String(raw);
}

// ---- MITRE ATT&CK : ID -> { nom, tactique (FR) } ----
export const MITRE_TECHNIQUES = {
  "T1566":     { name: "Hameçonnage", tactic: "Accès initial" },
  "T1566.001": { name: "Pièce jointe d'hameçonnage ciblé", tactic: "Accès initial" },
  "T1566.002": { name: "Lien d'hameçonnage ciblé", tactic: "Accès initial" },
  "T1190":     { name: "Exploitation d'application exposée", tactic: "Accès initial" },
  "T1133":     { name: "Services distants externes", tactic: "Accès initial" },
  "T1078":     { name: "Comptes valides", tactic: "Persistance" },
  "T1078.004": { name: "Comptes cloud", tactic: "Persistance" },
  "T1059":     { name: "Interpréteur de commandes et de scripts", tactic: "Exécution" },
  "T1059.001": { name: "PowerShell", tactic: "Exécution" },
  "T1059.003": { name: "Invite de commandes Windows", tactic: "Exécution" },
  "T1204":     { name: "Exécution par l'utilisateur", tactic: "Exécution" },
  "T1204.002": { name: "Fichier malveillant", tactic: "Exécution" },
  "T1053":     { name: "Tâche/travail planifié", tactic: "Persistance" },
  "T1053.005": { name: "Tâche planifiée", tactic: "Persistance" },
  "T1547":     { name: "Exécution automatique au démarrage", tactic: "Persistance" },
  "T1543":     { name: "Création ou modification de processus système", tactic: "Persistance" },
  "T1136":     { name: "Création de compte", tactic: "Persistance" },
  "T1068":     { name: "Exploitation pour élévation de privilèges", tactic: "Élévation de privilèges" },
  "T1548":     { name: "Abus du mécanisme de contrôle d'élévation", tactic: "Élévation de privilèges" },
  "T1055":     { name: "Injection de processus", tactic: "Évasion de défense" },
  "T1027":     { name: "Fichiers ou informations obfusqués", tactic: "Évasion de défense" },
  "T1070":     { name: "Suppression d'indicateurs", tactic: "Évasion de défense" },
  "T1112":     { name: "Modification du registre", tactic: "Évasion de défense" },
  "T1562":     { name: "Affaiblissement des défenses", tactic: "Évasion de défense" },
  "T1003":     { name: "Vol d'identifiants système (OS)", tactic: "Accès aux identifiants" },
  "T1003.001": { name: "Mémoire LSASS", tactic: "Accès aux identifiants" },
  "T1110":     { name: "Force brute", tactic: "Accès aux identifiants" },
  "T1110.003": { name: "Pulvérisation de mots de passe", tactic: "Accès aux identifiants" },
  "T1555":     { name: "Identifiants des gestionnaires de mots de passe", tactic: "Accès aux identifiants" },
  "T1056":     { name: "Capture de saisie", tactic: "Accès aux identifiants" },
  "T1087":     { name: "Découverte de comptes", tactic: "Découverte" },
  "T1082":     { name: "Découverte d'informations système", tactic: "Découverte" },
  "T1083":     { name: "Découverte de fichiers et répertoires", tactic: "Découverte" },
  "T1018":     { name: "Découverte de systèmes distants", tactic: "Découverte" },
  "T1046":     { name: "Découverte de services réseau", tactic: "Découverte" },
  "T1021":     { name: "Services distants", tactic: "Mouvement latéral" },
  "T1021.001": { name: "Protocole RDP (Bureau à distance)", tactic: "Mouvement latéral" },
  "T1021.002": { name: "Partages administratifs SMB/Windows", tactic: "Mouvement latéral" },
  "T1570":     { name: "Transfert latéral d'outils", tactic: "Mouvement latéral" },
  "T1005":     { name: "Données du système local", tactic: "Collecte" },
  "T1560":     { name: "Archivage des données collectées", tactic: "Collecte" },
  "T1071":     { name: "Protocole de couche applicative", tactic: "Commande et contrôle" },
  "T1071.001": { name: "Protocoles Web", tactic: "Commande et contrôle" },
  "T1105":     { name: "Transfert d'outil entrant", tactic: "Commande et contrôle" },
  "T1572":     { name: "Tunnelisation de protocole", tactic: "Commande et contrôle" },
  "T1041":     { name: "Exfiltration via le canal C2", tactic: "Exfiltration" },
  "T1567":     { name: "Exfiltration via un service Web", tactic: "Exfiltration" },
  "T1048":     { name: "Exfiltration via un protocole alternatif", tactic: "Exfiltration" },
  "T1486":     { name: "Données chiffrées pour impact", tactic: "Impact" },
  "T1490":     { name: "Inhibition de la restauration système", tactic: "Impact" },
  "T1489":     { name: "Arrêt de service", tactic: "Impact" },
  "T1498":     { name: "Déni de service réseau", tactic: "Impact" },
};

export function lookupMitre(id) {
  if (!id) return null;
  return MITRE_TECHNIQUES[String(id).trim().toUpperCase()] || null;
}
