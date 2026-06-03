/**
 * Digiforma GraphQL API utility functions
 * Uses Bearer token authentication
 */

/**
 * Generic Digiforma GraphQL call
 * @param {string} query - GraphQL query or mutation
 * @param {object} variables - GraphQL variables
 * @param {object} credentials - { token }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
async function digiformaGql(query, variables, credentials) {
  const { token } = credentials || {};
  if (!token) throw new Error('Digiforma credentials required (token)');

  const res = await fetch('https://app.digiforma.com/api/v1/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    return { ok: false, error: `Digiforma API error ${res.status}: ${text}` };
  }

  if (!res.ok) {
    const errMsg = body.message || body.error || JSON.stringify(body);
    return { ok: false, error: `Digiforma API error ${res.status}: ${errMsg}` };
  }

  if (body.errors && body.errors.length > 0) {
    const msg = body.errors.map(e => e.message).join('; ');
    return { ok: false, error: `GraphQL error: ${msg}` };
  }

  return { ok: true, data: body.data };
}

const handlers = {
  // ── Stagiaires ───────────────────────────────────────────

  async digiforma_trainees_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des stagiaires...');
    const query = `query($page: Int, $perPage: Int) {
      trainees(page: $page, perPage: $perPage) {
        id firstname lastname email phone status companyName
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const stagiaires = (res.data?.trainees || []).map(r => ({
      id: r.id, prenom: r.firstname, nom: r.lastname,
      email: r.email, telephone: r.phone,
      statut: r.status, entreprise: r.companyName
    }));
    return { ok: true, stagiaires, totalCount: stagiaires.length };
  },

  async digiforma_trainee_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération du stagiaire...');
    const query = `query($id: ID!) {
      trainee(id: $id) {
        id firstname lastname email phone birthdate status
        profession position companyName
        roadAddress zipcode city country
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const t = res.data?.trainee;
    if (!t) return { ok: false, error: 'Stagiaire non trouvé' };
    return {
      ok: true,
      data: {
        id: t.id, prenom: t.firstname, nom: t.lastname,
        email: t.email, telephone: t.phone,
        date_naissance: t.birthdate, statut: t.status,
        profession: t.profession, poste: t.position,
        entreprise: t.companyName,
        adresse: t.roadAddress, code_postal: t.zipcode,
        ville: t.city, pays: t.country
      }
    };
  },

  async digiforma_trainee_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création du stagiaire...');
    const input = {};
    if (inputs.firstname) input.firstname = inputs.firstname;
    if (inputs.lastname) input.lastname = inputs.lastname;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.birthdate) input.birthdate = inputs.birthdate;
    if (inputs.profession) input.profession = inputs.profession;
    if (inputs.position) input.position = inputs.position;
    if (inputs.companyName) input.companyName = inputs.companyName;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    const query = `mutation($input: TraineeInput!) {
      createTrainee(input: $input) {
        id firstname lastname email
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const t = res.data?.createTrainee;
    return {
      ok: true,
      data: { id: t?.id, prenom: t?.firstname, nom: t?.lastname, email: t?.email }
    };
  },

  async digiforma_trainee_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Modification du stagiaire...');
    const input = {};
    if (inputs.firstname) input.firstname = inputs.firstname;
    if (inputs.lastname) input.lastname = inputs.lastname;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.birthdate) input.birthdate = inputs.birthdate;
    if (inputs.profession) input.profession = inputs.profession;
    if (inputs.position) input.position = inputs.position;
    if (inputs.companyName) input.companyName = inputs.companyName;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    const query = `mutation($id: ID!, $input: TraineeInput!) {
      updateTrainee(id: $id, input: $input) {
        id firstname lastname email
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id, input }, opts?.credentials);
    if (!res.ok) return res;
    const t = res.data?.updateTrainee;
    return {
      ok: true,
      data: { id: t?.id, prenom: t?.firstname, nom: t?.lastname, email: t?.email }
    };
  },

  async digiforma_trainee_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Suppression du stagiaire...');
    const query = `mutation($id: ID!) {
      deleteTrainee(id: $id) { id }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    return { ok: true, deleted: true };
  },

  // ── Entreprises ──────────────────────────────────────────

  async digiforma_companies_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des entreprises...');
    const query = `query($page: Int, $perPage: Int) {
      companies(page: $page, perPage: $perPage) {
        id name siret siren email phone city
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const entreprises = (res.data?.companies || []).map(r => ({
      id: r.id, nom: r.name, siret: r.siret, siren: r.siren,
      email: r.email, telephone: r.phone, ville: r.city
    }));
    return { ok: true, entreprises, totalCount: entreprises.length };
  },

  async digiforma_company_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de l\'entreprise...');
    const query = `query($id: ID!) {
      company(id: $id) {
        id name siret siren email phone
        roadAddress zipcode city country
        vatNumber activity
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const c = res.data?.company;
    if (!c) return { ok: false, error: 'Entreprise non trouvée' };
    return {
      ok: true,
      data: {
        id: c.id, nom: c.name, siret: c.siret, siren: c.siren,
        email: c.email, telephone: c.phone,
        adresse: c.roadAddress, code_postal: c.zipcode,
        ville: c.city, pays: c.country,
        tva: c.vatNumber, activite: c.activity
      }
    };
  },

  async digiforma_company_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création de l\'entreprise...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.siret) input.siret = inputs.siret;
    if (inputs.siren) input.siren = inputs.siren;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    if (inputs.vatNumber) input.vatNumber = inputs.vatNumber;
    if (inputs.activity) input.activity = inputs.activity;
    const query = `mutation($input: CompanyInput!) {
      createCompany(input: $input) {
        id name siret email
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const c = res.data?.createCompany;
    return {
      ok: true,
      data: { id: c?.id, nom: c?.name, siret: c?.siret, email: c?.email }
    };
  },

  async digiforma_company_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Modification de l\'entreprise...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.siret) input.siret = inputs.siret;
    if (inputs.siren) input.siren = inputs.siren;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    if (inputs.vatNumber) input.vatNumber = inputs.vatNumber;
    if (inputs.activity) input.activity = inputs.activity;
    const query = `mutation($id: ID!, $input: CompanyInput!) {
      updateCompany(id: $id, input: $input) {
        id name siret email
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id, input }, opts?.credentials);
    if (!res.ok) return res;
    const c = res.data?.updateCompany;
    return {
      ok: true,
      data: { id: c?.id, nom: c?.name, siret: c?.siret, email: c?.email }
    };
  },

  async digiforma_company_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Suppression de l\'entreprise...');
    const query = `mutation($id: ID!) {
      deleteCompany(id: $id) { id }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    return { ok: true, deleted: true };
  },

  // ── Sessions ─────────────────────────────────────────────

  async digiforma_sessions_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des sessions...');
    const query = `query($page: Int, $perPage: Int) {
      trainingSessions(page: $page, perPage: $perPage) {
        id name status startDate endDate programName location
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const sessions = (res.data?.trainingSessions || []).map(r => ({
      id: r.id, nom: r.name, statut: r.status,
      date_debut: r.startDate, date_fin: r.endDate,
      programme: r.programName, lieu: r.location
    }));
    return { ok: true, sessions, totalCount: sessions.length };
  },

  async digiforma_session_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la session...');
    const query = `query($id: ID!) {
      trainingSession(id: $id) {
        id name status startDate endDate
        programName location capacity
        description reference
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const s = res.data?.trainingSession;
    if (!s) return { ok: false, error: 'Session non trouvée' };
    return {
      ok: true,
      data: {
        id: s.id, nom: s.name, statut: s.status,
        date_debut: s.startDate, date_fin: s.endDate,
        programme: s.programName, lieu: s.location,
        capacite: s.capacity, description: s.description,
        reference: s.reference
      }
    };
  },

  async digiforma_session_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création de la session...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.programId) input.programId = inputs.programId;
    if (inputs.startDate) input.startDate = inputs.startDate;
    if (inputs.endDate) input.endDate = inputs.endDate;
    if (inputs.location) input.location = inputs.location;
    if (inputs.capacity) input.capacity = parseInt(inputs.capacity, 10);
    if (inputs.description) input.description = inputs.description;
    const query = `mutation($input: TrainingSessionInput!) {
      createTrainingSession(input: $input) {
        id name status startDate endDate
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const s = res.data?.createTrainingSession;
    return {
      ok: true,
      data: { id: s?.id, nom: s?.name, statut: s?.status, date_debut: s?.startDate, date_fin: s?.endDate }
    };
  },

  async digiforma_session_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Modification de la session...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.startDate) input.startDate = inputs.startDate;
    if (inputs.endDate) input.endDate = inputs.endDate;
    if (inputs.location) input.location = inputs.location;
    if (inputs.capacity) input.capacity = parseInt(inputs.capacity, 10);
    if (inputs.description) input.description = inputs.description;
    if (inputs.status) input.status = inputs.status;
    const query = `mutation($id: ID!, $input: TrainingSessionInput!) {
      updateTrainingSession(id: $id, input: $input) {
        id name status startDate endDate
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id, input }, opts?.credentials);
    if (!res.ok) return res;
    const s = res.data?.updateTrainingSession;
    return {
      ok: true,
      data: { id: s?.id, nom: s?.name, statut: s?.status, date_debut: s?.startDate, date_fin: s?.endDate }
    };
  },

  // ── Programmes ───────────────────────────────────────────

  async digiforma_programs_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des programmes...');
    const query = `query($page: Int, $perPage: Int) {
      programs(page: $page, perPage: $perPage) {
        id name level duration status category
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const programmes = (res.data?.programs || []).map(r => ({
      id: r.id, nom: r.name, niveau: r.level,
      duree: r.duration, statut: r.status,
      categorie: r.category
    }));
    return { ok: true, programmes, totalCount: programmes.length };
  },

  async digiforma_program_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération du programme...');
    const query = `query($id: ID!) {
      program(id: $id) {
        id name level duration status
        category description goals
        prerequisites targetAudience
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const p = res.data?.program;
    if (!p) return { ok: false, error: 'Programme non trouvé' };
    return {
      ok: true,
      data: {
        id: p.id, nom: p.name, niveau: p.level,
        duree: p.duration, statut: p.status,
        categorie: p.category, description: p.description,
        objectifs: p.goals, prerequis: p.prerequisites,
        public_cible: p.targetAudience
      }
    };
  },

  async digiforma_program_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création du programme...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.level) input.level = inputs.level;
    if (inputs.duration) input.duration = inputs.duration;
    if (inputs.category) input.category = inputs.category;
    if (inputs.description) input.description = inputs.description;
    if (inputs.goals) input.goals = inputs.goals;
    if (inputs.prerequisites) input.prerequisites = inputs.prerequisites;
    if (inputs.targetAudience) input.targetAudience = inputs.targetAudience;
    const query = `mutation($input: ProgramInput!) {
      createProgram(input: $input) {
        id name level duration status
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const p = res.data?.createProgram;
    return {
      ok: true,
      data: { id: p?.id, nom: p?.name, niveau: p?.level, duree: p?.duration, statut: p?.status }
    };
  },

  async digiforma_program_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Modification du programme...');
    const input = {};
    if (inputs.name) input.name = inputs.name;
    if (inputs.level) input.level = inputs.level;
    if (inputs.duration) input.duration = inputs.duration;
    if (inputs.category) input.category = inputs.category;
    if (inputs.description) input.description = inputs.description;
    if (inputs.goals) input.goals = inputs.goals;
    if (inputs.prerequisites) input.prerequisites = inputs.prerequisites;
    if (inputs.targetAudience) input.targetAudience = inputs.targetAudience;
    const query = `mutation($id: ID!, $input: ProgramInput!) {
      updateProgram(id: $id, input: $input) {
        id name level duration status
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id, input }, opts?.credentials);
    if (!res.ok) return res;
    const p = res.data?.updateProgram;
    return {
      ok: true,
      data: { id: p?.id, nom: p?.name, niveau: p?.level, duree: p?.duration, statut: p?.status }
    };
  },

  // ── Formateurs ───────────────────────────────────────────

  async digiforma_instructors_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des formateurs...');
    const query = `query($page: Int, $perPage: Int) {
      instructors(page: $page, perPage: $perPage) {
        id firstname lastname email phone status
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const formateurs = (res.data?.instructors || []).map(r => ({
      id: r.id, prenom: r.firstname, nom: r.lastname,
      email: r.email, telephone: r.phone, statut: r.status
    }));
    return { ok: true, formateurs, totalCount: formateurs.length };
  },

  async digiforma_instructor_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération du formateur...');
    const query = `query($id: ID!) {
      instructor(id: $id) {
        id firstname lastname email phone status
        profession speciality
        roadAddress zipcode city country
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const i = res.data?.instructor;
    if (!i) return { ok: false, error: 'Formateur non trouvé' };
    return {
      ok: true,
      data: {
        id: i.id, prenom: i.firstname, nom: i.lastname,
        email: i.email, telephone: i.phone, statut: i.status,
        profession: i.profession, specialite: i.speciality,
        adresse: i.roadAddress, code_postal: i.zipcode,
        ville: i.city, pays: i.country
      }
    };
  },

  async digiforma_instructor_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création du formateur...');
    const input = {};
    if (inputs.firstname) input.firstname = inputs.firstname;
    if (inputs.lastname) input.lastname = inputs.lastname;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.profession) input.profession = inputs.profession;
    if (inputs.speciality) input.speciality = inputs.speciality;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    const query = `mutation($input: InstructorInput!) {
      createInstructor(input: $input) {
        id firstname lastname email
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const i = res.data?.createInstructor;
    return {
      ok: true,
      data: { id: i?.id, prenom: i?.firstname, nom: i?.lastname, email: i?.email }
    };
  },

  async digiforma_instructor_update(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Modification du formateur...');
    const input = {};
    if (inputs.firstname) input.firstname = inputs.firstname;
    if (inputs.lastname) input.lastname = inputs.lastname;
    if (inputs.email) input.email = inputs.email;
    if (inputs.phone) input.phone = inputs.phone;
    if (inputs.profession) input.profession = inputs.profession;
    if (inputs.speciality) input.speciality = inputs.speciality;
    if (inputs.roadAddress) input.roadAddress = inputs.roadAddress;
    if (inputs.zipcode) input.zipcode = inputs.zipcode;
    if (inputs.city) input.city = inputs.city;
    if (inputs.country) input.country = inputs.country;
    const query = `mutation($id: ID!, $input: InstructorInput!) {
      updateInstructor(id: $id, input: $input) {
        id firstname lastname email
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id, input }, opts?.credentials);
    if (!res.ok) return res;
    const i = res.data?.updateInstructor;
    return {
      ok: true,
      data: { id: i?.id, prenom: i?.firstname, nom: i?.lastname, email: i?.email }
    };
  },

  async digiforma_instructor_delete(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Suppression du formateur...');
    const query = `mutation($id: ID!) {
      deleteInstructor(id: $id) { id }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    return { ok: true, deleted: true };
  },

  // ── Factures ─────────────────────────────────────────────

  async digiforma_invoices_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des factures...');
    const query = `query($page: Int, $perPage: Int) {
      invoices(page: $page, perPage: $perPage) {
        id reference status totalAmount currency
        issueDate dueDate companyName
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const factures = (res.data?.invoices || []).map(r => ({
      id: r.id, reference: r.reference, statut: r.status,
      montant_total: r.totalAmount, devise: r.currency,
      date_emission: r.issueDate, date_echeance: r.dueDate,
      entreprise: r.companyName
    }));
    return { ok: true, factures, totalCount: factures.length };
  },

  async digiforma_invoice_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération de la facture...');
    const query = `query($id: ID!) {
      invoice(id: $id) {
        id reference status totalAmount currency
        issueDate dueDate companyName
        description taxAmount
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const f = res.data?.invoice;
    if (!f) return { ok: false, error: 'Facture non trouvée' };
    return {
      ok: true,
      data: {
        id: f.id, reference: f.reference, statut: f.status,
        montant_total: f.totalAmount, devise: f.currency,
        date_emission: f.issueDate, date_echeance: f.dueDate,
        entreprise: f.companyName,
        description: f.description, montant_taxes: f.taxAmount
      }
    };
  },

  async digiforma_invoice_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création de la facture...');
    const input = {};
    if (inputs.companyId) input.companyId = inputs.companyId;
    if (inputs.trainingSessionId) input.trainingSessionId = inputs.trainingSessionId;
    if (inputs.reference) input.reference = inputs.reference;
    if (inputs.totalAmount) input.totalAmount = parseFloat(inputs.totalAmount);
    if (inputs.currency) input.currency = inputs.currency;
    if (inputs.issueDate) input.issueDate = inputs.issueDate;
    if (inputs.dueDate) input.dueDate = inputs.dueDate;
    if (inputs.description) input.description = inputs.description;
    const query = `mutation($input: InvoiceInput!) {
      createInvoice(input: $input) {
        id reference status totalAmount
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const f = res.data?.createInvoice;
    return {
      ok: true,
      data: { id: f?.id, reference: f?.reference, statut: f?.status, montant_total: f?.totalAmount }
    };
  },

  // ── Devis ────────────────────────────────────────────────

  async digiforma_quotations_list(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération des devis...');
    const query = `query($page: Int, $perPage: Int) {
      quotations(page: $page, perPage: $perPage) {
        id reference status totalAmount currency
        issueDate validUntil companyName
      }
    }`;
    const res = await digiformaGql(query, {
      page: inputs.page || 1,
      perPage: inputs.per_page || 25
    }, opts?.credentials);
    if (!res.ok) return res;
    const devis = (res.data?.quotations || []).map(r => ({
      id: r.id, reference: r.reference, statut: r.status,
      montant_total: r.totalAmount, devise: r.currency,
      date_emission: r.issueDate, valide_jusqua: r.validUntil,
      entreprise: r.companyName
    }));
    return { ok: true, devis, totalCount: devis.length };
  },

  async digiforma_quotation_get(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Récupération du devis...');
    const query = `query($id: ID!) {
      quotation(id: $id) {
        id reference status totalAmount currency
        issueDate validUntil companyName
        description taxAmount
      }
    }`;
    const res = await digiformaGql(query, { id: inputs.id }, opts?.credentials);
    if (!res.ok) return res;
    const d = res.data?.quotation;
    if (!d) return { ok: false, error: 'Devis non trouvé' };
    return {
      ok: true,
      data: {
        id: d.id, reference: d.reference, statut: d.status,
        montant_total: d.totalAmount, devise: d.currency,
        date_emission: d.issueDate, valide_jusqua: d.validUntil,
        entreprise: d.companyName,
        description: d.description, montant_taxes: d.taxAmount
      }
    };
  },

  async digiforma_quotation_create(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    log('Création du devis...');
    const input = {};
    if (inputs.companyId) input.companyId = inputs.companyId;
    if (inputs.trainingSessionId) input.trainingSessionId = inputs.trainingSessionId;
    if (inputs.reference) input.reference = inputs.reference;
    if (inputs.totalAmount) input.totalAmount = parseFloat(inputs.totalAmount);
    if (inputs.currency) input.currency = inputs.currency;
    if (inputs.issueDate) input.issueDate = inputs.issueDate;
    if (inputs.validUntil) input.validUntil = inputs.validUntil;
    if (inputs.description) input.description = inputs.description;
    const query = `mutation($input: QuotationInput!) {
      createQuotation(input: $input) {
        id reference status totalAmount
      }
    }`;
    const res = await digiformaGql(query, { input }, opts?.credentials);
    if (!res.ok) return res;
    const d = res.data?.createQuotation;
    return {
      ok: true,
      data: { id: d?.id, reference: d?.reference, statut: d?.status, montant_total: d?.totalAmount }
    };
  },
};

module.exports = { digiformaGql, handlers };
