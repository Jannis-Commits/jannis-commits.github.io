// Finanzen: Cashflow, Kredite, Investoren, Börsengang, Firmenwert, Bankrott.
import { FINANCE } from '../../config/balance.js';
import { ROUNDS, ROUND_GAP } from '../../config/finance.js';
import { OFFICES } from '../../config/offices.js';
import { clamp } from '../util/math.js';
import { nid, sIdx, fx, note, log, playerProducts } from './core.js';
import { weeklySalaries } from './staff.js';
import { budgetCost, freelanceIncome } from './projects.js';
import { valuation, avgOf } from './rivals.js';

const loanBoost = (s) => (s.boosts.includes('loans') ? 0.5 : 1);

export function debt(s) {
  return s.finance.loans.reduce((a, l) => a + l.remaining, 0);
}

export function loanLimit(s) {
  const annual = avgOf(s.finance.revHist, 0, 13) * 52;
  const lim = (FINANCE.loanBaseLimit * sIdx(s) + annual * FINANCE.loanRevenueFactor) * (s.boosts.includes('loans') ? 2 : 1);
  return Math.max(0, Math.round(lim - debt(s)));
}

export const loanRate = (s) => FINANCE.loanRate * loanBoost(s) * (s.flags.recession ? 1.3 : 1);

function payment(principal, rate, weeks) {
  const r = rate / 52;
  return principal * r / (1 - Math.pow(1 + r, -weeks));
}

export function takeLoan(s, amount, weeks) {
  amount = Math.round(amount);
  if (amount <= 0 || amount > loanLimit(s)) return 'Über deinem Kreditrahmen';
  const rate = loanRate(s);
  s.finance.loans.push({ id: nid(s), principal: amount, remaining: amount, rate, weeks, weeksLeft: weeks, payment: payment(amount, rate, weeks) });
  s.money += amount;
  log(s, '🏦', `Kredit über ${Math.round(amount)} $ aufgenommen`);
  return null;
}

export function repayLoan(s, id) {
  const l = s.finance.loans.find((x) => x.id === id);
  if (!l) return 'Nicht gefunden';
  if (s.money < l.remaining) return 'Zu wenig Geld';
  s.money -= l.remaining;
  s.finance.loans = s.finance.loans.filter((x) => x !== l);
  return null;
}

export function rentOf(s) {
  return Math.round(OFFICES[s.office].rent * sIdx(s));
}

export function weeklyCosts(s) {
  const prods = playerProducts(s);
  const salaries = Math.round(weeklySalaries(s));
  const rent = rentOf(s);
  const servers = prods.reduce((a, p) => a + (p.serverCost || 0), 0);
  const budgets = s.projects.reduce((a, p) => a + budgetCost(s, p), 0);
  const loans = s.finance.loans.reduce((a, l) => a + l.payment, 0);
  return { salaries, rent, servers, budgets, loans, total: salaries + rent + servers + budgets + loans };
}

export function weeklyIncome(s) {
  const prods = playerProducts(s).reduce((a, p) => a + (p.revenue || 0), 0);
  const freelance = freelanceIncome(s);
  return { products: prods, freelance, total: prods + freelance };
}

export function computeValue(s) {
  const f = s.finance;
  let extra = (f.ipo ? FINANCE.ipoMultiple : 1) * f.sentiment;
  if (s.flags.dotcom) extra *= 0.7;
  if (s.flags.aiHype && s.products.some((p) => p.owner === 'player' && p.cat === 'ai')) extra *= 1.3;
  return valuation(avgOf(f.revHist, 0, 13), avgOf(f.revHist, 13, 26), s.rep, Math.max(0, s.money), debt(s), extra);
}

// --- Investoren ---
export function nextRound(s) {
  return ROUNDS.find((r) => !s.finance.roundsDone.includes(r.id));
}

function makeOffer(s) {
  const f = s.finance;
  if (f.offer || f.investor || f.ipo) return;
  const r = nextRound(s);
  if (!r || f.value < r.minValue || f.revHist.length < 26) return;
  if (avgOf(f.revHist, 0, 13) * 52 < r.minRev || s.week - (f.lastRoundWeek ?? -999) < ROUND_GAP) return;
  const rev = Math.max(avgOf(f.revHist, 0, 4), 300 * sIdx(s));
  f.offer = {
    round: r.id, name: r.name, investor: r.investor, share: r.share,
    amount: Math.round(Math.max(r.minAmount, f.value * r.share * r.premium)),
    targetRev: Math.round(rev * r.growth), weeks: r.weeks, until: s.week + 12,
  };
  note(s, '💼', `${r.investor} bietet eine ${r.name} an – schau unter Markt → Finanzen.`);
}

export function acceptOffer(s) {
  const f = s.finance;
  const o = f.offer;
  if (!o) return 'Kein Angebot';
  s.money += o.amount;
  f.ownedShare *= 1 - o.share;
  f.roundsDone.push(o.round);
  f.lastRoundWeek = s.week;
  const r = ROUNDS.find((x) => x.id === o.round);
  f.investor = { round: o.round, name: o.name, targetRev: o.targetRev, deadline: s.week + o.weeks, penaltyShare: r.penaltyShare };
  f.offer = null;
  log(s, '💼', `${o.name} abgeschlossen: +${Math.round(o.amount)} $ für ${Math.round(o.share * 100)} %`);
  return null;
}

export function declineOffer(s) {
  const o = s.finance.offer;
  if (!o) return;
  s.finance.offer = null;
  s.finance.lastRoundWeek = s.week;
}

// --- Börsengang ---
export function ipoReady(s) {
  const f = s.finance;
  return !f.ipo && f.value >= FINANCE.ipoMinValue && avgOf(f.revHist, 0, 13) * 52 >= FINANCE.ipoMinRevenueYear;
}

export function goPublic(s) {
  if (!ipoReady(s)) return 'Noch nicht bereit für den Börsengang';
  const f = s.finance;
  const raised = f.value * FINANCE.ipoFloat * 1.1;
  s.money += raised;
  f.ownedShare *= 1 - FINANCE.ipoFloat;
  f.ipo = true;
  f.ipoWeek = s.week;
  f.investor = null;
  f.offer = null;
  s.rep = Math.min(100, s.rep + 8);
  note(s, '🔔', `Börsengang! Du sammelst ${Math.round(raised / 1e6)} Mio. $ ein.`, true);
  return null;
}

export function tickFinance(s) {
  const f = s.finance;
  const inc = weeklyIncome(s);
  const cost = weeklyCosts(s);
  s.money += inc.total - cost.total;
  s.report.income = inc.total;
  s.report.expense = cost.total;

  // Kredite tilgen
  for (const l of [...f.loans]) {
    const interest = l.remaining * l.rate / 52;
    l.remaining = Math.max(0, l.remaining - (l.payment - interest));
    l.weeksLeft--;
    if (l.weeksLeft <= 0 || l.remaining < 1) f.loans = f.loans.filter((x) => x !== l);
  }

  f.revHist.push(inc.total);
  if (f.revHist.length > 30) f.revHist.shift();
  f.value = computeValue(s);
  s.stats.peakValue = Math.max(s.stats.peakValue, f.value);
  f.history.push({ w: s.week, inc: Math.round(inc.total), exp: Math.round(cost.total), value: Math.round(f.value), money: Math.round(s.money) });
  if (f.history.length > 260) f.history.shift();

  // Investoren-Ziele
  if (f.investor) {
    if (avgOf(f.revHist, 0, 4) >= f.investor.targetRev) {
      note(s, '✅', `Investorenziel der ${f.investor.name} erreicht! Ruf +3`);
      s.rep = Math.min(100, s.rep + 3);
      f.investor = null;
    } else if (s.week >= f.investor.deadline) {
      f.ownedShare *= 1 - f.investor.penaltyShare;
      s.rep = Math.max(0, s.rep - 4);
      for (const m of s.staff) m.morale = Math.max(0, m.morale - 5);
      note(s, '⚠️', `Investorenziel verfehlt – Investoren holen sich ${Math.round(f.investor.penaltyShare * 100)} % zusätzliche Anteile.`, true);
      f.investor = null;
    }
  }
  if (f.offer && s.week > f.offer.until) declineOffer(s);
  makeOffer(s);

  // Quartalszahlen nach dem Börsengang
  if (f.ipo && (s.week - f.ipoWeek) % FINANCE.quarterWeeks === 0) {
    const g = avgOf(f.revHist, 0, 13) / Math.max(1, avgOf(f.revHist, 13, 26)) - 1;
    const exp = 0.02;
    const delta = clamp((g - exp) * 1.5, -0.15, 0.15);
    f.sentiment = clamp(f.sentiment * (1 + delta), 0.6, 1.6);
    note(s, delta >= 0 ? '📈' : '📉', `Quartalszahlen: Umsatz ${g >= 0 ? '+' : ''}${Math.round(g * 100)} % – Aktie ${delta >= 0 ? '+' : ''}${Math.round(delta * 100)} %`);
  }

  // Bankrott
  if (s.money < 0) {
    s.negWeeks++;
    if (s.negWeeks === 1) note(s, '🚨', `Konto im Minus! Nach ${FINANCE.bankruptWeeks} Wochen im Minus ist Schluss.`, true);
    if (s.negWeeks >= FINANCE.bankruptWeeks) {
      s.gameOver = 'bankrupt';
      s.queue.push({ type: 'gameover', reason: 'bankrupt' });
    }
  } else s.negWeeks = 0;
}
