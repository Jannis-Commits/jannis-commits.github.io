import * as F from '../util/format.js';
import { TYPE, PRODUCT_TYPES, AUDIENCES, AUDIENCE, expectedFeatures } from '../../config/productTypes.js';
import { featuresOf, FEATURE } from '../../config/features.js';
import { MODEL } from '../../config/businessModels.js';
import { ROLE } from '../../config/roles.js';
import { WORK } from '../../config/balance.js';
import { NODE } from '../../config/research.js';
import { catUnlocked, hasTech, yf, productById, staffById } from '../engine/core.js';
import { PHASES, projectWork, teamOf, teamPoints, projectEta, estimateQuality, featureScore, budgetCost, maxPlatforms, memberPoints } from '../engine/projects.js';
import { platformsFor, platformName, refPrice, priceFactor } from '../engine/market.js';
import { techFit } from '../engine/research.js';
import { campaignsAvailable, campaignCost } from '../engine/marketing.js';
import { btn, chip, bar, h2, empty, pick, sheetHead, stepper, kv, initials } from './components.js';
import { coachCard } from './tutorial.js';

export function projectsView(s, ui) {
  let html = coachCard(s, 'projects');
  html += btn('＋ Neues Projekt', 'newProject', {}, { cls: 'block' });
  html += h2('In Arbeit', s.projects.length ? `${s.projects.length}` : '');
  if (!s.projects.length) html += empty('Gerade entsteht nichts. Starte ein Projekt – am Anfang ist ein kleines Tool genau richtig.');
  for (const p of s.projects) html += projectCard(s, p);
  return html;
}

function phaseProgress(p) {
  if (p.phase === 'test') return p.testDone / p.testWeeks;
  return p.progress / p.work;
}

function projectCard(s, p) {
  const t = TYPE[p.cat];
  const team = teamOf(s, p);
  const eta = projectEta(s, p);
  const ph = PHASES[p.phase];
  return `<div class="card tap" data-act="openProject" data-id="${p.id}">
    <div class="row"><div class="ico blue">${t.icon}</div><div class="grow">
      <div class="title">${F.esc(p.name)}${p.version > 1 ? ` v${p.version}` : ''}</div>
      <div class="sub">${t.name} für ${AUDIENCE[p.aud].name}</div></div>
      ${chip(`${ph.icon} ${ph.name}`, p.phase === 'test' ? 'amber' : 'blue')}</div>
    <div class="mt">${bar(phaseProgress(p), p.phase === 'test' ? 'amber' : '')}</div>
    <div class="row mt sub"><span class="grow">${team.length ? `👥 ${team.length}` : '<b class="neg">Kein Team</b>'} · 🐞 ${Math.round(p.bugs)} · 🔥 ${Math.round(p.hype)}</span>
      <span>${isFinite(eta) ? `fertig in ${F.weeks(eta)}` : '—'}</span></div>
  </div>`;
}

// ---------- Projekt-Detail ----------
export function projectSheet(s, ui) {
  const p = s.projects.find((x) => x.id === ui.sheet.id);
  if (!p) return sheetHead('Projekt nicht gefunden');
  const t = TYPE[p.cat];
  const est = estimateQuality(s, p);
  const eta = projectEta(s, p);
  let html = sheetHead(`${F.esc(p.name)}${p.version > 1 ? ` v${p.version}` : ''}`, t.icon);
  html += `<div class="stats three">
    <div class="stat"><div class="k">Phase</div><div class="v">${PHASES[p.phase].name}</div></div>
    <div class="stat"><div class="k">Fertig in</div><div class="v">${isFinite(eta) ? F.weeks(eta) : '—'}</div></div>
    <div class="stat"><div class="k">Qualität ≈</div><div class="v">${Math.round(est.q)}</div></div></div>`;
  html += `<div class="card">
    ${kv('Fortschritt', p.phase === 'test' ? `Testing ${p.testDone}/${p.testWeeks} Wochen` : `${Math.round(p.progress / p.work * 100)} %`)}
    ${kv('Leistung', `${teamPoints(s, p).toFixed(1)} Punkte/Woche`)}
    ${kv('Bugs', Math.round(p.bugs), p.bugs > 20 ? 'neg' : '')}
    ${kv('Hype', Math.round(p.hype))}
    ${kv('Features', p.features.map((id) => FEATURE[id].name).join(', '))}
    ${kv('Plattform', p.platforms.length ? p.platforms.map((pl) => platformName(s, pl)).join(', ') : '—')}
    ${kv('Modell', `${MODEL[p.model].name}${MODEL[p.model].hasPrice ? ` · ${F.money(p.price)}${MODEL[p.model].priceUnit}` : ''}`)}
    ${kv('Budget', `${WORK.budgetLevels[p.budget].name} (${F.money(budgetCost(s, p))}/Woche)`)}
  </div>`;
  html += `<div class="row"><span class="grow">Testing-Wochen</span>${stepper(String(p.testWeeks), 'projTest', { id: p.id })}</div>`;
  html += `<p class="tiny mt">Mehr Testing = weniger Bugs. QA-Leute fixen im Testing am meisten.</p>`;
  if (p.phase === 'test') html += btn('🚀 Jetzt releasen', 'releaseNow', { id: p.id }, { cls: 'block mt' });

  html += h2('Team', `${teamOf(s, p).length} Leute`);
  html += teamPicker(s, (m) => m.assign === `p:${p.id}`, 'projMember', { pid: p.id }, p);

  html += h2('Marketing', 'Hype bis zum Release');
  html += btn('📣 Kampagne starten', 'openCampaign', { kind: 'project', id: p.id }, { cls: 'ghost block' });
  html += `<div class="btns">${btn('Projekt abbrechen', 'cancelProject', { id: p.id }, { cls: 'danger' })}</div>`;
  return html;
}

function assignLabel(s, m) {
  if (!m.assign) return 'frei';
  if (m.assign === 'research') return 'Forschung';
  if (m.assign === 'freelance') return 'Auftragsarbeit';
  if (m.assign.startsWith('p:')) return s.projects.find((x) => x.id === +m.assign.slice(2))?.name || 'Projekt';
  if (m.assign.startsWith('s:')) return `Support ${productById(s, +m.assign.slice(2))?.name || ''}`;
  return m.assign;
}
export { assignLabel };

// Liste aller arbeitenden MA mit Häkchen
export function teamPicker(s, isOn, act, data, project = null) {
  const list = s.staff.filter((m) => ROLE[m.role].work || m.founder)
    .sort((a, b) => Number(isOn(b)) - Number(isOn(a)) || Number(!a.assign) - Number(!b.assign) || b.skill - a.skill);
  if (!list.length) return empty('Noch niemand im Team.');
  const phaseP = project || { phase: 'dev', budget: 0 };
  return list.map((m) => {
    const on = isOn(m);
    const pts = memberPoints(s, m, phaseP);
    return pick(on, `<div class="row"><div class="grow"><div class="title">${F.esc(m.name)} ${m.founder ? '⭐' : ''}</div>
      <div class="sub">${ROLE[m.role].icon} ${m.founder ? 'Gründer:in' : ROLE[m.role].short} · Skill ${m.skill} · ${on ? 'im Team' : assignLabel(s, m)}</div></div>
      <div class="right tiny">${pts.toFixed(1)} P/W</div></div>`, act, { ...data, id: m.id });
  }).join('');
}

// ---------- Wizard ----------
export function newForm(s) {
  return { step: 1, cat: null, aud: 'p', platforms: [], features: [], model: null, price: 0, budget: 0, testWeeks: 2, team: [], name: '' };
}

const STEPS = ['Typ', 'Plattform', 'Features', 'Modell', 'Team'];

export function wizardSheet(s, f) {
  const first = f.baseProductId ? 2 : 1;
  const base = f.baseProductId ? productById(s, f.baseProductId) : null;
  let html = sheetHead(base ? `Update: ${F.esc(base.name)} v${base.version + 1}` : 'Neues Projekt', f.cat ? TYPE[f.cat].icon : '✨');
  html += `<div class="steps">${STEPS.map((_, i) => `<i class="${i + 1 <= f.step ? 'on' : ''}"></i>`).join('')}</div>`;
  if (f.step === 1) html += stepType(s, f);
  if (f.step === 2) html += stepPlatform(s, f);
  if (f.step === 3) html += stepFeatures(s, f);
  if (f.step === 4) html += stepModel(s, f);
  if (f.step === 5) html += stepTeam(s, f);
  const canNext = f.step === 1 ? !!f.cat : f.step === 2 ? (needsPlatform(f) ? f.platforms.length > 0 : true) : f.step === 3 ? f.features.length > 0 : true;
  html += `<div class="foot">${f.step > first ? btn('Zurück', 'wzBack', {}, { cls: 'plain' }) : ''}
    ${f.step < 5 ? btn('Weiter', 'wzNext', {}, { disabled: !canNext }) : btn(base ? 'Update starten' : 'Projekt starten', 'wzStart')}</div>`;
  return html;
}

const needsPlatform = (f) => f.cat && ['desktop', 'mobile'].includes(TYPE[f.cat].group);

function stepType(s, f) {
  let html = '<p class="sub">Was willst du bauen?</p><div class="grid2">';
  for (const t of PRODUCT_TYPES) {
    const ok = catUnlocked(s, t.id);
    const reason = ok ? '' : yf(s) < t.year ? `ab ${t.year}` : t.group === 'store' && !s.products.some((p) => p.owner === 'player' && TYPE[p.cat].group === 'os') ? 'braucht eigenes OS'
      : t.group === 'store' && s.products.some((p) => p.owner === 'player' && p.cat === 'app_store') ? 'hast du schon' : `🔒 ${NODE[t.unlock]?.name || ''}`;
    html += `<button class="pick ${f.cat === t.id ? 'on' : ''}" data-act="wzCat" data-id="${t.id}"${ok ? '' : ' disabled'}>
      <span style="font-size:24px">${t.icon}</span><b style="font-size:14px">${t.name}</b><span class="tiny">${ok ? `${F.count(t.market.length ? curveSize(t, s) : 0)} Nutzer` : reason}</span></button>`;
  }
  html += '</div>';
  if (f.cat) html += `<p class="sub mt">${TYPE[f.cat].desc}</p>`;
  return html;
}

function curveSize(t, s) {
  // grobe aktuelle Marktgröße für die Anzeige
  const y = yf(s);
  let prev = t.market[0];
  for (const pt of t.market) { if (pt[0] > y) { const k = (y - prev[0]) / (pt[0] - prev[0] || 1); return Math.exp(Math.log(prev[1]) + (Math.log(pt[1]) - Math.log(prev[1])) * Math.max(0, k)); } prev = pt; }
  return prev[1];
}

function stepPlatform(s, f) {
  const t = TYPE[f.cat];
  let html = '';
  if (needsPlatform(f)) {
    const max = maxPlatforms(s);
    html += `<h2>Plattform <span class="meta">max. ${max}${max > 1 ? ` · je weitere +${Math.round(WORK.extraPlatform * 100)} % Aufwand` : ''}</span></h2>`;
    const pls = platformsFor(s, f.cat);
    if (!pls.length) html += empty('Noch keine Plattform verfügbar.');
    for (const pl of pls) {
      const on = f.platforms.includes(pl.id);
      html += pick(on, `<div class="row"><span style="font-size:20px">${pl.icon}</span><div class="grow"><div class="title">${platformName(s, pl.id)}</div>
        <div class="sub">Reichweite ${F.pct(s.reach[pl.id] || 0)}</div></div></div>`, 'wzPlat', { id: pl.id },
      { disabled: !on && f.platforms.length >= max && max > 1 });
    }
  } else {
    html += `<p class="sub">${t.group === 'web' ? 'Läuft im Browser – erreicht alle.' : t.group === 'os' ? 'Ein Betriebssystem ist selbst die Plattform.' : 'Läuft auf deinem eigenen OS.'}</p>`;
  }
  html += '<h2>Zielgruppe</h2>';
  for (const a of AUDIENCES) {
    html += pick(f.aud === a.id, `<div class="row"><span style="font-size:20px">${a.icon}</span><div class="grow"><div class="title">${a.name}</div>
      <div class="sub">${F.pct(t.audience[a.id])} des Markts</div></div></div>`, 'wzAud', { id: a.id }, { check: false });
  }
  return html;
}

function stepFeatures(s, f) {
  const t = TYPE[f.cat];
  const ai = { p: 0, b: 1, d: 2 }[f.aud];
  const exp = expectedFeatures(yf(s));
  const fs = featureScore(s, f.cat, f.aud, f.features);
  let html = `<div class="card flat"><div class="row"><span class="grow">Feature-Passung für ${AUDIENCE[f.aud].name}</span><b>${Math.round(fs / 1.15 * 100)} %</b></div>
    <div class="mt">${bar(fs / 1.15, fs >= 1 ? 'green' : '')}</div><p class="tiny mt">Erwartet werden etwa ${exp.toFixed(1)} passende Features. Mehr Features = mehr Arbeit.</p></div>`;
  for (const ft of featuresOf(f.cat)) {
    const ok = hasTech(s, ft.tech);
    const on = f.features.includes(ft.id);
    const fit = ft.fit[ai];
    html += pick(on, `<div class="row"><div class="grow"><div class="title">${ft.name}</div>
      <div class="sub">${ok ? `+${Math.round(ft.effort * 100)} % Aufwand` : `🔒 ${NODE[ft.tech].name}`}</div></div>
      ${ok ? chip(`Passung ${Math.round(fit * 100)} %`, fit >= 0.85 ? 'green' : fit >= 0.6 ? 'blue' : '') : ''}</div>`, 'wzFeat', { id: ft.id }, { disabled: !ok });
  }
  return html;
}

function stepModel(s, f) {
  const t = TYPE[f.cat];
  let html = '<h2>Geschäftsmodell</h2>';
  for (const id of t.models) {
    const m = MODEL[id];
    html += pick(f.model === id, `<div class="row"><span style="font-size:20px">${m.icon}</span><div class="grow"><div class="title">${m.name}</div>
      <div class="sub">${m.desc}</div></div></div>`, 'wzModel', { id }, { check: false });
  }
  const m = MODEL[f.model];
  if (m?.hasPrice) {
    const ref = refPrice(f.cat, f.aud, f.model);
    const pf = priceFactor(s, { cat: f.cat, aud: f.aud, model: f.model, price: f.price });
    html += `<h2>Preis <span class="meta">üblich: ${F.money(ref)}${m.priceUnit}</span></h2>
      <div class="row"><div class="grow">${stepper(`${fmtPrice(f.price)}${m.priceUnit ? '<br><span class="tiny">' + m.priceUnit + '</span>' : ''}`, 'wzPrice')}</div>
      <div class="right"><div class="tiny">Nachfrage</div><b class="${pf < 0.6 ? 'neg' : pf > 1.1 ? 'pos' : ''}">${Math.round(pf * 100)} %</b></div></div>`;
  }
  html += '<h2>Budget</h2>';
  WORK.budgetLevels.forEach((b, i) => {
    const cost = budgetCost(s, { cat: f.cat, budget: i });
    html += pick(f.budget === i, `<div class="row"><div class="grow"><div class="title">${b.name}</div>
      <div class="sub">${i ? `+${b.quality} Qualität, +${Math.round(b.speed * 100)} % Tempo` : 'Nur Gehälter'}</div></div><b>${F.money(cost)}/W</b></div>`, 'wzBudget', { id: i }, { check: false });
  });
  html += `<h2>Testing</h2><div class="row"><span class="grow sub">Wochen Testing nach der Entwicklung</span>${stepper(String(f.testWeeks), 'wzTest')}</div>`;
  return html;
}

export const fmtPrice = (p) => (p >= 100 ? F.money(p) : `${F.num(p, 2)} $`);

function stepTeam(s, f) {
  const work = projectWork(s, f);
  const fake = { phase: 'dev', budget: f.budget, cat: f.cat };
  const pts = f.team.reduce((a, id) => { const m = staffById(s, id); return a + (m ? memberPoints(s, m, fake) : 0); }, 0);
  const tf = techFit(s, f.cat);
  const fs = featureScore(s, f.cat, f.aud, f.features);
  let html = `<label class="sub">Name</label><input type="text" data-input="wzName" value="${F.esc(f.name)}" maxlength="28" placeholder="Name des Produkts" ${f.baseProductId ? 'disabled' : ''}>`;
  html += `<div class="card flat mt">
    ${kv('Aufwand', `${Math.round(work)} Punkte`)}
    ${kv('Dauer', pts ? `≈ ${F.weeks(work / pts + f.testWeeks)}` : 'wähle ein Team')}
    ${kv('Feature-Passung', `${Math.round(fs / 1.15 * 100)} %`)}
    ${kv('Tech-Level', `${Math.round(tf / 1.1 * 100)} %`, tf < 0.7 ? 'neg' : '')}
  </div>`;
  if (tf < 0.7) html += `<p class="tiny">Dein Tech-Level in diesem Bereich ist veraltet – Forschung hebt die Qualität.</p>`;
  html += h2('Team', `${f.team.length} gewählt`);
  html += teamPicker(s, (m) => f.team.includes(m.id), 'wzMember', {}, fake);
  return html;
}

// ---------- Kampagnen ----------
export function campaignSheet(s, ui) {
  const { target: kind, id } = ui.sheet;
  const target = kind === 'project' ? s.projects.find((x) => x.id === id) : productById(s, id);
  let html = sheetHead(`Marketing für ${F.esc(target?.name || '')}`, '📣');
  html += `<p class="sub">${kind === 'project' ? 'Hype vor dem Release bringt mehr Nutzer zum Start.' : 'Kampagnen machen dein Produkt eine Zeit lang attraktiver.'}</p>`;
  for (const c of campaignsAvailable(s)) {
    const cost = campaignCost(s, c);
    const running = s.campaigns.some((x) => x.kind === kind && x.targetId === id && x.id === c.id);
    const locked = c.minRep && s.rep < c.minRep;
    html += `<div class="card"><div class="row"><div class="ico">${c.icon}</div><div class="grow"><div class="title">${c.name}</div>
      <div class="sub">${c.weeks} Wochen · ${kind === 'project' ? `+${c.hype} Hype` : `+${Math.round(c.boost * 100)} % Attraktivität`}${locked ? ` · braucht ${c.minRep} Ruf` : ''}</div></div>
      ${btn(running ? 'läuft' : F.money(cost), 'startCampaign', { cid: c.id, kind, id }, { cls: 'sm', disabled: running || locked || s.money < cost })}</div></div>`;
  }
  return html;
}
