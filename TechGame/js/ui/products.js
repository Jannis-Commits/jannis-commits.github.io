import * as F from '../util/format.js';
import { TYPE, AUDIENCE } from '../../config/productTypes.js';
import { MODEL } from '../../config/businessModels.js';
import { FEATURE } from '../../config/features.js';
import { ECOSYSTEM } from '../../config/balance.js';
import { playerProducts, productById } from '../engine/core.js';
import { freshness, platformName, refPrice, priceFactor, ownOSShare, productReach } from '../engine/market.js';
import { teamPicker, fmtPrice } from './projects.js';
import { canPreinstall, totalApps, rivalApps, hasStore, storeRevenue } from '../engine/ecosystem.js';
import { btn, chip, bar, h2, empty, sheetHead, stepper, kv, stars, toggle, stat } from './components.js';
import { coachCard } from './tutorial.js';

export function productsView(s, ui) {
  const prods = playerProducts(s).sort((a, b) => b.revenue - a.revenue);
  let html = coachCard(s, 'products');
  const rev = prods.reduce((a, p) => a + p.revenue, 0);
  const users = prods.filter((p) => p.cat !== 'app_store').reduce((a, p) => a + p.users, 0);
  html += `<div class="stats three">${stat('Produkte', prods.length)}${stat('Nutzer', F.count(users))}${stat('Umsatz/W', F.money(rev))}</div>`;
  html += ecosystemCard(s);
  html += h2('Deine Produkte');
  if (!prods.length) html += empty('Noch nichts veröffentlicht. Dein erstes Projekt landet hier, sobald es fertig ist.', btn('Zu den Projekten', 'tab', { id: 'projects' }, { cls: 'sm' }));
  for (const p of prods) html += productCard(s, p);
  return html;
}

function productCard(s, p) {
  const t = TYPE[p.cat];
  const fr = freshness(s, p);
  const updating = s.projects.some((x) => x.baseProductId === p.id);
  const support = s.staff.filter((m) => m.assign === `s:${p.id}`).length;
  return `<div class="card tap" data-act="openProduct" data-id="${p.id}">
    <div class="row"><div class="ico">${t.icon}</div><div class="grow">
      <div class="title">${F.esc(p.name)} <span class="muted">v${p.version}</span></div>
      <div class="sub">${p.cat === 'app_store' ? `${F.count(p.users)} Apps` : `${F.count(p.users)} Nutzer`} ${p.cat !== 'app_store' ? stars(p.rating) : ''}</div></div>
      <div class="right"><b>${F.money(p.revenue)}</b><div class="tiny">pro Woche</div></div></div>
    <div class="row mt"><span class="tiny" style="width:64px">Aktualität</span><div class="grow">${bar(fr, fr < 0.5 ? 'red' : fr < 0.7 ? 'amber' : 'green', true)}</div></div>
    <div class="gap mt">${p.bugs >= 1 ? chip(`🐞 ${Math.round(p.bugs)}`, p.bugs > 12 ? 'red' : 'amber') : chip('bugfrei', 'green')}
      ${support ? chip(`🛠️ ${support} Support`) : ''}${updating ? chip('Update in Arbeit', 'blue') : ''}${p.preinstall ? chip('vorinstalliert', 'blue') : ''}
      ${p.share >= 0.0005 ? chip(`${F.pct(p.share, p.share < 0.1 ? 1 : 0)} Markt`) : ''}</div>
  </div>`;
}

function ecosystemCard(s) {
  const osList = playerProducts(s).filter((p) => TYPE[p.cat].group === 'os');
  if (!osList.length) return '';
  let html = h2('Ökosystem');
  html += '<div class="card hl">';
  for (const g of ['desktop', 'mobile']) {
    const cat = g === 'mobile' ? 'os_mobile' : 'os_desktop';
    if (!osList.some((p) => p.cat === cat)) continue;
    const share = ownOSShare(s, cat);
    const apps = totalApps(s, g);
    html += `<div class="title">${g === 'mobile' ? '📱 Mobile-OS' : '🪟 Desktop-OS'}: ${F.pct(share, 1)} Marktanteil</div>
      <div class="row sub"><span class="grow">${F.count(s.eco[g].devs)} Entwickler</span><span>${F.count(apps)} Apps (Konkurrenz: ${F.count(rivalApps(s, g))})</span></div>
      <div class="mt" style="margin-bottom:10px">${bar(Math.min(1, apps / rivalApps(s, g)))}</div>`;
  }
  if (hasStore(s)) {
    html += `<div class="row"><span class="grow">🛍️ Store-Provision</span>${stepper(F.pct(s.eco.storeCut), 'storeCut')}</div>
      <p class="tiny">Hohe Provision = mehr Geld je App, aber weniger Entwickler. Umsatz: ${F.money(storeRevenue(s))}/Woche</p>`;
  } else html += '<p class="tiny">Tipp: Ein App-Store (Forschung „App-Store-Plattform“) lockt mehr Entwickler an und bringt Provision.</p>';
  if (s.antitrust > 0) html += `<div class="row mt"><span class="grow sub">Kartellrisiko</span><b class="${s.antitrust > 50 ? 'neg' : ''}">${Math.round(s.antitrust)} %</b></div>`;
  return html + '</div>';
}

export function productSheet(s, ui) {
  const p = productById(s, ui.sheet.id);
  if (!p || p.owner !== 'player') return sheetHead('Produkt nicht gefunden');
  const t = TYPE[p.cat];
  const m = MODEL[p.model];
  const fr = freshness(s, p);
  let html = sheetHead(`${F.esc(p.name)} v${p.version}`, t.icon);
  html += `<div class="stats three">
    <div class="stat"><div class="k">Bewertung</div><div class="v">${p.cat === 'app_store' ? '—' : p.rating.toFixed(1) + ' ★'}</div></div>
    <div class="stat"><div class="k">${p.cat === 'app_store' ? 'Apps' : 'Nutzer'}</div><div class="v">${F.count(p.users)}</div></div>
    <div class="stat"><div class="k">Umsatz/W</div><div class="v">${F.money(p.revenue)}</div></div></div>`;
  html += `<div class="card">
    ${kv('Kategorie', `${t.name} für ${AUDIENCE[p.aud].name}`)}
    ${kv('Qualität', Math.round(p.quality))}
    ${kv('Aktualität', F.pct(fr), fr < 0.5 ? 'neg' : '')}
    ${p.cat !== 'app_store' ? kv('Marktanteil', F.pct(p.share || 0, 1)) : ''}
    ${p.platforms?.length ? kv('Plattform', `${p.platforms.map((pl) => platformName(s, pl)).join(', ')} (${F.pct(productReach(s, p))} Reichweite)`) : ''}
    ${kv('Serverkosten', `${F.money(p.serverCost || 0)}/Woche`)}
    ${kv('Bugs', `${Math.round(p.bugs)} offen · Patch ${p.version}.0.${p.patch || 0}`, p.bugs > 12 ? 'neg' : '')}
    ${p.features?.length ? kv('Features', p.features.map((id) => FEATURE[id]?.name).filter(Boolean).join(', ')) : ''}
    ${kv('Veröffentlicht', F.date(Math.max(0, p.released)))}
  </div>`;

  if (m.hasPrice) {
    const ref = refPrice(p.cat, p.aud, p.model);
    const pf = priceFactor(s, p);
    html += `<h2>Preis <span class="meta">${m.name}, üblich ${fmtPrice(ref)}</span></h2>
      <div class="row"><div class="grow">${stepper(`${fmtPrice(p.price)}${m.priceUnit ? `<br><span class="tiny">${m.priceUnit}</span>` : ''}`, 'prodPrice', { id: p.id })}</div>
      <div class="right"><div class="tiny">Nachfrage</div><b>${Math.round(pf * 100)} %</b></div></div>`;
  } else html += `<p class="sub mt">Modell: ${m.icon} ${m.name}</p>`;

  if (canPreinstall(s, p)) {
    html += `<div class="card mt"><div class="row"><div class="grow"><div class="title">Auf deinem OS vorinstallieren</div>
      <div class="sub">+${Math.round(ECOSYSTEM.preinstallBoost * 100)} % × OS-Anteil Attraktivität – aber Kartellrisiko</div></div>${toggle(p.preinstall, 'prodPreinstall', { id: p.id })}</div></div>`;
  }

  if (p.cat !== 'app_store') {
    html += h2('Support', 'fixt Bugs, bringt Patches');
    html += teamPicker(s, (mm) => mm.assign === `s:${p.id}`, 'prodSupport', { pid: p.id }, { phase: 'test', budget: 0 });
  }
  html += `<div class="btns">${btn('📣 Marketing', 'openCampaign', { kind: 'product', id: p.id }, { cls: 'ghost' })}
    ${btn(`⬆️ Update v${p.version + 1}`, 'startUpdate', { id: p.id }, { cls: 'ghost', disabled: s.projects.some((x) => x.baseProductId === p.id) })}</div>`;
  html += `<div class="btns">${btn('Produkt einstellen', 'retireProduct', { id: p.id }, { cls: 'danger' })}</div>`;
  return html;
}
