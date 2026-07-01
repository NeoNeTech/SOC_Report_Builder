// ============================================================
// TEMPLATES — playbooks d'incident qui pré-remplissent le rapport
// pour que l'analyste parte d'un squelette plutôt que d'une page vide.
// Champs simples : remplis seulement si vides. Listes : ajoutées.
// ============================================================
import { state, newId } from "./state.js";

const mitre = (id, name, tactic) => ({ _id: newId(), id, name, tactic });
const contain = (action, status = "Planifié") => ({ _id: newId(), action, responsible: "", status });
const reco = (priority, recommendation) => ({ _id: newId(), priority, recommendation, owner: "" });

export const TEMPLATES = [
  {
    id: "phishing",
    name: "Hameçonnage",
    icon: "fish",
    desc: "Email de vol d'identifiants ou pièce jointe malveillante",
    vector: "Email",
    summary: "Un email d'hameçonnage a été signalé/détecté et cible un ou plusieurs utilisateurs. L'analyse porte sur le leurre, la diffusion, la charge utile ou la page de collecte d'identifiants, et l'interaction des utilisateurs.",
    mitre: [
      mitre("T1566.001", "Pièce jointe d'hameçonnage ciblé", "Accès initial"),
      mitre("T1204.002", "Fichier malveillant", "Exécution"),
      mitre("T1078", "Comptes valides", "Persistance"),
    ],
    containment: [
      contain("Mettre en quarantaine / supprimer l'email de toutes les boîtes"),
      contain("Bloquer le domaine expéditeur et les URL malveillantes à la passerelle"),
      contain("Forcer la réinitialisation des mots de passe des comptes impactés"),
    ],
    recommendations: [
      reco("Élevée", "Imposer le MFA sur tous les comptes exposés à la page d'hameçonnage"),
      reco("Moyenne", "Sensibiliser les utilisateurs concernés à l'hameçonnage"),
    ],
  },
  {
    id: "malware",
    name: "Malware / Rançongiciel",
    icon: "bug",
    desc: "Détection de malware ou de rançongiciel sur un poste",
    vector: "Email",
    summary: "Un code malveillant a été détecté sur un ou plusieurs postes. L'analyse porte sur l'exécution initiale, la persistance, les tentatives de mouvement latéral et tout impact de chiffrement ou de destruction de données.",
    mitre: [
      mitre("T1204.002", "Fichier malveillant", "Exécution"),
      mitre("T1059.001", "PowerShell", "Exécution"),
      mitre("T1055", "Injection de processus", "Évasion de défense"),
      mitre("T1486", "Données chiffrées pour impact", "Impact"),
    ],
    containment: [
      contain("Isoler les postes affectés du réseau"),
      contain("Bloquer les hash/indicateurs C2 malveillants (EDR + pare-feu)"),
      contain("Réaliser une image forensique / mémoire avant remédiation"),
    ],
    recommendations: [
      reco("Critique", "Reconstruire les hôtes compromis à partir d'une image saine"),
      reco("Élevée", "Vérifier et tester les sauvegardes hors ligne pour la restauration"),
    ],
  },
  {
    id: "bruteforce",
    name: "Force brute / Compromission de compte",
    icon: "key-round",
    desc: "Pulvérisation de mots de passe, force brute ou connexions suspectes",
    vector: "Réseau",
    summary: "Une activité d'authentification anormale a été détectée (force brute / pulvérisation de mots de passe / voyage impossible). L'analyse porte sur les IP sources, les comptes ciblés, les schémas de succès/échec et l'activité post-accès.",
    mitre: [
      mitre("T1110", "Force brute", "Accès aux identifiants"),
      mitre("T1110.003", "Pulvérisation de mots de passe", "Accès aux identifiants"),
      mitre("T1078", "Comptes valides", "Persistance"),
    ],
    containment: [
      contain("Bloquer les plages d'IP sources fautives"),
      contain("Désactiver / réinitialiser les comptes compromis"),
      contain("Révoquer les sessions et jetons actifs des comptes impactés"),
    ],
    recommendations: [
      reco("Élevée", "Imposer le MFA et des politiques de verrouillage/limitation"),
      reco("Moyenne", "Ajuster les seuils de détection des schémas de pulvérisation"),
    ],
  },
  {
    id: "exfiltration",
    name: "Exfiltration de données",
    icon: "database-backup",
    desc: "Suspicion de vol de données / transfert sortant inhabituel",
    vector: "Réseau",
    summary: "Un transfert de données sortant suspect a été détecté. L'analyse porte sur les données consultées, le canal d'exfiltration, le volume et la destination, ainsi que l'étendue des informations potentiellement exposées.",
    mitre: [
      mitre("T1005", "Données du système local", "Collecte"),
      mitre("T1560", "Archivage des données collectées", "Collecte"),
      mitre("T1041", "Exfiltration via le canal C2", "Exfiltration"),
      mitre("T1567", "Exfiltration via un service Web", "Exfiltration"),
    ],
    containment: [
      contain("Bloquer les IP/domaines de destination et le canal d'exfiltration"),
      contain("Suspendre les comptes / clés API impliqués"),
      contain("Préserver les logs proxy, DLP et netflow"),
    ],
    recommendations: [
      reco("Élevée", "Évaluer les obligations réglementaires/de notification pour les données exposées"),
      reco("Moyenne", "Déployer/ajuster des règles DLP sur la classe de données affectée"),
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
