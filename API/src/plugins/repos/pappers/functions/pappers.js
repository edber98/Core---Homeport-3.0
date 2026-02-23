// Pappers API handler functions
// Each exported function name MUST match the nodeTemplate key

const { pappersApi } = require('./utils');

module.exports = {
  // ── Entreprises ──────────────────────────────────────────

  async pappers_entreprise_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de l\'entreprise...');
    const res = await pappersApi('/entreprise', inputs, opts?.credentials, {
      queryParams: ['siren', 'siret']
    });
    if (!res.ok) return res;
    const d = res.data || {};
    return {
      ok: true, status: res.status,
      data: {
        siren: d.siren, siret: d.siret, denomination: d.denomination,
        nom_entreprise: d.nom_entreprise, forme_juridique: d.forme_juridique,
        date_creation: d.date_creation, date_cessation: d.date_cessation,
        entreprise_cessee: d.entreprise_cessee, categorie_juridique: d.categorie_juridique,
        effectif: d.effectif, capital: d.capital, chiffre_affaires: d.chiffre_affaires,
        resultat: d.resultat, tranche_effectif: d.tranche_effectif,
        code_naf: d.code_naf, libelle_code_naf: d.libelle_code_naf,
        domaine_activite: d.domaine_activite,
        objet_social: d.objet_social,
        numero_tva: d.numero_tva,
        siege: d.siege ? {
          siret: d.siege.siret,
          adresse_ligne_1: d.siege.adresse_ligne_1,
          code_postal: d.siege.code_postal,
          ville: d.siege.ville,
          pays: d.siege.pays,
          latitude: d.siege.latitude,
          longitude: d.siege.longitude
        } : null
      }
    };
  },

  async pappers_entreprise_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Recherche d\'entreprises...');
    const res = await pappersApi('/recherche', inputs, opts?.credentials, {
      queryParams: ['q', 'code_naf', 'departement', 'code_postal', 'entreprise_cessee',
        'capital_min', 'capital_max', 'chiffre_affaires_min', 'chiffre_affaires_max', 'par_page', 'page']
    });
    if (!res.ok) return res;
    const resultats = (res.data?.resultats || []).map(r => ({
      siren: r.siren, siret: r.siret, denomination: r.denomination,
      nom_entreprise: r.nom_entreprise, forme_juridique: r.forme_juridique,
      code_naf: r.code_naf, libelle_code_naf: r.libelle_code_naf,
      effectif: r.effectif, date_creation: r.date_creation,
      entreprise_cessee: r.entreprise_cessee,
      siege_adresse: r.siege?.adresse_ligne_1,
      siege_code_postal: r.siege?.code_postal,
      siege_ville: r.siege?.ville
    }));
    return { ok: true, resultats, totalCount: res.data?.total || resultats.length };
  },

  async pappers_suggestions(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des suggestions...');
    const res = await pappersApi('/suggestions', inputs, opts?.credentials, {
      queryParams: ['q', 'longueur']
    });
    if (!res.ok) return res;
    const suggestions = (res.data?.resultats_nom_entreprise || []).map(r => ({
      siren: r.siren, denomination: r.denomination,
      nom_entreprise: r.nom_entreprise,
      forme_juridique: r.forme_juridique,
      siege_ville: r.siege?.ville,
      siege_code_postal: r.siege?.code_postal
    }));
    return { ok: true, suggestions, totalCount: suggestions.length };
  },

  // ── Dirigeants ───────────────────────────────────────────

  async pappers_dirigeants_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Recherche de dirigeants...');
    const res = await pappersApi('/recherche-dirigeants', inputs, opts?.credentials, {
      queryParams: ['q', 'nom_dirigeant', 'prenom_dirigeant', 'siren', 'par_page', 'page']
    });
    if (!res.ok) return res;
    const dirigeants = (res.data?.resultats || []).map(r => ({
      nom: r.nom, prenom: r.prenom, date_de_naissance: r.date_de_naissance,
      qualite: r.qualite, denomination: r.denomination, siren: r.siren,
      forme_juridique: r.forme_juridique
    }));
    return { ok: true, dirigeants, totalCount: res.data?.total || dirigeants.length };
  },

  // ── Bénéficiaires ────────────────────────────────────────

  async pappers_beneficiaires_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Recherche de bénéficiaires...');
    const res = await pappersApi('/recherche-beneficiaires', inputs, opts?.credentials, {
      queryParams: ['q', 'nationalite_beneficiaire', 'siren', 'par_page', 'page']
    });
    if (!res.ok) return res;
    const beneficiaires = (res.data?.resultats || []).map(r => ({
      nom: r.nom, prenom: r.prenom, nationalite: r.nationalite,
      date_de_naissance: r.date_de_naissance,
      pourcentage_parts: r.pourcentage_parts,
      denomination: r.denomination, siren: r.siren
    }));
    return { ok: true, beneficiaires, totalCount: res.data?.total || beneficiaires.length };
  },

  // ── Finance ──────────────────────────────────────────────

  async pappers_comptes_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des comptes annuels...');
    const res = await pappersApi('/entreprise/comptes', inputs, opts?.credentials, {
      queryParams: ['siren', 'annee']
    });
    if (!res.ok) return res;
    const comptes = (res.data?.comptes || []).map(c => ({
      annee: c.annee, date_cloture: c.date_cloture,
      duree_exercice: c.duree_exercice,
      chiffre_affaires: c.chiffre_affaires,
      resultat: c.resultat, effectif: c.effectif,
      capital_social: c.capital_social
    }));
    return { ok: true, comptes, totalCount: comptes.length };
  },

  // ── Documents ────────────────────────────────────────────

  async pappers_documents_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Recherche de documents...');
    const res = await pappersApi('/recherche-documents', inputs, opts?.credentials, {
      queryParams: ['q', 'siren', 'date_depot_document_min', 'date_depot_document_max', 'par_page', 'page']
    });
    if (!res.ok) return res;
    const documents = (res.data?.resultats || []).map(r => ({
      titre: r.titre, type: r.type, date_depot: r.date_depot,
      siren: r.siren, denomination: r.denomination,
      url_telechargement: r.url_telechargement
    }));
    return { ok: true, documents, totalCount: res.data?.total || documents.length };
  },

  // ── Publications ─────────────────────────────────────────

  async pappers_publications_search(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Recherche de publications BODACC...');
    const res = await pappersApi('/recherche-publications', inputs, opts?.credentials, {
      queryParams: ['q', 'siren', 'type_publication', 'date_publication_min', 'date_publication_max', 'par_page', 'page']
    });
    if (!res.ok) return res;
    const publications = (res.data?.resultats || []).map(r => ({
      type: r.type, date_publication: r.date_publication,
      contenu: r.contenu, siren: r.siren,
      denomination: r.denomination,
      numero_bodacc: r.numero_bodacc
    }));
    return { ok: true, publications, totalCount: res.data?.total || publications.length };
  },

  // ── Conformité ───────────────────────────────────────────

  async pappers_conformite_check(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Vérification de conformité...');
    const res = await pappersApi('/conformite/personne_physique', inputs, opts?.credentials, {
      queryParams: ['nom', 'prenom', 'date_de_naissance']
    });
    if (!res.ok) return res;
    const d = res.data || {};
    return {
      ok: true, status: res.status,
      data: {
        conforme: d.conforme,
        liste_sanctions: d.liste_sanctions,
        liste_pep: d.liste_pep,
        nombre_resultats: d.nombre_resultats
      }
    };
  },

  // ── Documents PDF ────────────────────────────────────────

  async pappers_avis_insee(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Téléchargement de l\'avis INSEE...');
    const res = await pappersApi('/document/avis_situation_insee', inputs, opts?.credentials, {
      queryParams: ['siren'],
      responseType: 'buffer'
    });
    if (!res.ok) return res;
    const filename = `avis_insee_${inputs.siren}.pdf`;
    let fileUrl = null;
    if (opts?.files?.store) {
      try {
        fileUrl = await opts.files.store(res.data, filename, 'application/pdf');
      } catch (e) {
        log('Erreur stockage fichier: ' + e.message);
      }
    }
    return {
      ok: true, status: res.status,
      data: { filename, fileUrl, siren: inputs.siren }
    };
  },

  async pappers_extrait_inpi(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Téléchargement de l\'extrait INPI...');
    const res = await pappersApi('/document/extrait_inpi', inputs, opts?.credentials, {
      queryParams: ['siren'],
      responseType: 'buffer'
    });
    if (!res.ok) return res;
    const filename = `extrait_inpi_${inputs.siren}.pdf`;
    let fileUrl = null;
    if (opts?.files?.store) {
      try {
        fileUrl = await opts.files.store(res.data, filename, 'application/pdf');
      } catch (e) {
        log('Erreur stockage fichier: ' + e.message);
      }
    }
    return {
      ok: true, status: res.status,
      data: { filename, fileUrl, siren: inputs.siren }
    };
  },

  // ── Associations ─────────────────────────────────────────

  async pappers_association_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de l\'association...');
    const res = await pappersApi('/association', inputs, opts?.credentials, {
      queryParams: ['siren', 'siret', 'id_association']
    });
    if (!res.ok) return res;
    const d = res.data || {};
    return {
      ok: true, status: res.status,
      data: {
        id_association: d.id_association, siren: d.siren,
        denomination: d.denomination, objet: d.objet,
        date_creation: d.date_creation, date_publication: d.date_publication,
        adresse_siege: d.adresse_siege, code_postal: d.code_postal,
        ville: d.ville, nature: d.nature,
        is_waldec: d.is_waldec
      }
    };
  },
};
