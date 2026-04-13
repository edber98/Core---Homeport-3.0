import { download } from './utils.js';

export function exportMonthlyCsv(sim){
  const sep = ';';
  const head = ['mois','consultants_actifs','clients_attaches','pool','revenu','base_recruits','roco_recruits'].join(sep);
  const rows = sim.monthly.map(r=>[
    r.ym,
    r.activeConsultants,
    r.activeAttachedClients,
    r.poolActive,
    Math.round(r.revenue),
    r.baseRecruitsAdded,
    r.rocoRecruitsAdded,
  ].join(sep));
  download(`mensuel_${sim.params.seed}.csv`, [head, ...rows].join('\n'));
}

export function exportAnnualCsv(sim){
  const sep = ';';
  const head = ['annee','nouveaux','base_recruits','roco_recruits','moy_clients_par_consultant_fin'].join(sep);
  const rows = sim.annual.map(r=>[
    r.year, r.newConsultants, r.baseRecruits, r.rocoRecruits, r.avgClientsPerConsultantEnd.toFixed(2)
  ].join(sep));
  download(`annuel_${sim.params.seed}.csv`, [head, ...rows].join('\n'));
}

export function exportConsultantsCsv(sim, monthIdx){
  const snap = sim.cacheByMonth[monthIdx];
  const sep = ';';
  const head = ['id','origin','referrer','createdM','active','clients_actifs','projectsWon'].join(sep);
  const rows = snap.consultants.map(c=>[
    c.id, c.origin, c.referrerId??'', c.createdMonthIndex, c.isActive?1:0, c.clientsCount, c.projectsWon
  ].join(sep));
  download(`consultants_M${monthIdx}_${sim.params.seed}.csv`, [head, ...rows].join('\n'));
}

export function exportPoolCsv(sim, monthIdx){
  const snap = sim.cacheByMonth[monthIdx];
  const sep = ';';
  const head = ['clientId','originConsultantId','poolStartM','exitConsultantM'].join(sep);
  const rows = snap.pool.map(p=>[
    p.id, p.originConsultantId??'', p.poolStartMonthIndex??'', p.poolFromConsultantExitMonth??''
  ].join(sep));
  download(`pool_M${monthIdx}_${sim.params.seed}.csv`, [head, ...rows].join('\n'));
}

