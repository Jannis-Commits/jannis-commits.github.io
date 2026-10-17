// Marketing-Kampagnen für Projekte (Hype vor Release) und Produkte (Boost danach)
import { MARKETING } from '../../config/balance.js';
import { CAMPAIGNS, CAMPAIGN } from '../../config/marketing.js';
import { yf, sIdx, fx, hasTech, projectById, productById } from './core.js';
import { teamPower } from './staff.js';

export const campaignCost = (s, c) => Math.round(c.cost * sIdx(s));

export function campaignsAvailable(s) {
  return CAMPAIGNS.filter((c) => yf(s) >= c.year && (!c.until || yf(s) < c.until) && (!c.tech || hasTech(s, c.tech)));
}

export const marketingMult = (s) => 1 + Math.min(1.5, 0.15 * Math.pow(teamPower(s, 'marketing'), 0.7)) + fx(s, 'marketing');

export function startCampaign(s, cid, kind, targetId) {
  const c = CAMPAIGN[cid];
  if (!c) return 'Unbekannt';
  if (c.minRep && s.rep < c.minRep) return `Braucht mindestens ${c.minRep} Ruf`;
  const cost = campaignCost(s, c);
  if (s.money < cost) return 'Zu wenig Geld';
  const target = kind === 'project' ? projectById(s, targetId) : productById(s, targetId);
  if (!target) return 'Ziel nicht gefunden';
  if (s.campaigns.some((x) => x.kind === kind && x.targetId === targetId && x.id === cid)) return 'Läuft schon';
  s.money -= cost;
  const mult = marketingMult(s);
  s.campaigns.push({ id: cid, kind, targetId, weeksLeft: c.weeks, hypePerWeek: (c.hype * mult) / c.weeks, boost: c.boost });
  return null;
}

export function tickCampaigns(s) {
  // passiver Hype durch Marketing-Team auf laufende Projekte
  const passive = MARKETING.passiveHypePerStaff * teamPower(s, 'marketing');
  if (s.projects.length) for (const p of s.projects) p.hype = Math.min(250, p.hype + passive / s.projects.length);
  for (const p of s.projects) p.hype *= 0.99;

  for (const p of s.products) if (p.owner === 'player') p.boost = 0;
  for (const c of [...s.campaigns]) {
    const t = c.kind === 'project' ? projectById(s, c.targetId) : productById(s, c.targetId);
    if (!t) { s.campaigns = s.campaigns.filter((x) => x !== c); continue; }
    t.hype = Math.min(250, t.hype + c.hypePerWeek);
    if (c.kind === 'product') t.boost = (t.boost || 0) + c.boost;
    c.weeksLeft--;
    if (c.weeksLeft <= 0) s.campaigns = s.campaigns.filter((x) => x !== c);
  }
}
