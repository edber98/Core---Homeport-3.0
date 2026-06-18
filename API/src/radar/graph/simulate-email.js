// Génère des emails SIMULÉS réalistes pour tester l'analyse d'emails sans vrais
// credentials. Certains proviennent d'adresses de tiers connus (partyEmails) →
// ils se relient aux entités existantes dans le graphe (mémoire cross-source).

const SUBJECTS_CLIENT = [
  ['Relance facture impayée', 'Bonjour, nous revenons vers vous concernant la facture en attente de règlement…'],
  ['Demande de devis', 'Pourriez-vous nous établir un devis pour une commande de cartons sur mesure ?'],
  ['Question sur la livraison', 'La livraison prévue cette semaine est-elle maintenue ? Merci de confirmer.'],
  ['Réclamation qualité', 'Nous avons constaté un défaut sur le dernier lot reçu, pouvez-vous nous rappeler ?'],
  ['Confirmation de commande', 'Nous validons la commande CO-2026 discutée hier, merci de lancer la production.'],
];
const SUBJECTS_SUPPLIER = [
  ['Nouvelle grille tarifaire 2026', 'Veuillez trouver ci-joint notre nouvelle grille de prix applicable au 1er juillet.'],
  ['Avis d\'expédition', 'Votre commande a été expédiée ce jour, livraison estimée sous 48h.'],
  ['Facture fournisseur', 'Bonjour, vous trouverez en pièce jointe notre facture du mois.'],
];
const NEWSLETTERS = [
  ['contact@newsletter-eco.fr', 'Éco-Veille', 'La veille économique de la semaine', 'Les tendances du marché de l\'emballage…'],
  ['news@logiciel-compta.fr', 'Compta Pro', 'Nouveautés produit — juin 2026', 'Découvrez les dernières fonctionnalités…'],
  ['no-reply@banque-pro.fr', 'Banque Pro', 'Votre relevé est disponible', 'Votre relevé mensuel est consultable en ligne.'],
];
const INTERNAL = [
  ['marie.compta@kinn.fr', 'Marie (Compta)', 'Point clôture mensuelle', 'On fait le point sur les pièces manquantes avant clôture ?'],
  ['paul.atelier@kinn.fr', 'Paul (Atelier)', 'Planning production semaine 25', 'Voici le planning de l\'atelier pour la semaine prochaine.'],
];

function pad(n) { return String(n).padStart(2, '0'); }

/**
 * Génère des emails simulés. Pur (déterministe via index), pas de Math.random.
 * @param {object} opts
 * @param {string[]} opts.partyEmails - adresses de tiers connus (pour le cross-link)
 * @param {Date} [opts.now]
 * @returns {Array<object>} enregistrements bruts d'email (mêmes champs partout)
 */
function generateEmails({ partyEmails = [], now = new Date() } = {}) {
  const out = [];
  const baseTs = now.getTime();
  let i = 0;
  const at = (daysAgo, h = 9) => new Date(baseTs - daysAgo * 86400000).setHours(h, 0, 0, 0) && Math.floor((baseTs - daysAgo * 86400000) / 1000);

  // Emails de clients connus (cross-link vers les tiers du graphe)
  partyEmails.slice(0, 8).forEach((email, k) => {
    const [subject, snippet] = SUBJECTS_CLIENT[k % SUBJECTS_CLIENT.length];
    out.push({
      id: `sim_c_${++i}`, fromEmail: String(email).toLowerCase(), fromName: email.split('@')[0],
      to: 'contact@kinn.fr', subject, snippet, date: at(k + 1, 8 + (k % 6)), threadId: `t_c_${k}`,
    });
  });

  // Fournisseurs
  SUBJECTS_SUPPLIER.forEach(([subject, snippet], k) => {
    out.push({
      id: `sim_s_${++i}`, fromEmail: `fournisseur${k + 1}@appro-pro.fr`, fromName: `Appro Pro ${k + 1}`,
      to: 'achats@kinn.fr', subject, snippet, date: at(k + 2, 10), threadId: `t_s_${k}`,
    });
  });

  // Newsletters / automatiques (bruit — utile pour tester la pertinence)
  NEWSLETTERS.forEach(([fromEmail, fromName, subject, snippet], k) => {
    out.push({ id: `sim_n_${++i}`, fromEmail, fromName, to: 'contact@kinn.fr', subject, snippet, date: at(k + 1, 6), threadId: `t_n_${k}` });
  });

  // Internes
  INTERNAL.forEach(([fromEmail, fromName, subject, snippet], k) => {
    out.push({ id: `sim_i_${++i}`, fromEmail, fromName, to: 'equipe@kinn.fr', subject, snippet, date: at(k + 1, 14), threadId: `t_i_${k}` });
  });

  return out;
}

module.exports = { generateEmails };
