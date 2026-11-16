import * as XLSX from 'xlsx';
import { CATEGORIES, catLabel, LEVEL_COLORS } from './theme';

export const levelOptionsFor = (cat) =>
  cat === 'GBB' ? ['A', 'B'] : cat === 'IndivBB' ? ['A', 'B', 'C', 'D', 'E', 'TT'] : [];

export const MONTHS_FR = ['Jan', 'Fév', 'Mars', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];

export const DEFAULT_GOALS = { ctt: 0, bbGroup: 0, ab: 0, c: 0, de: 0, tt: 0 };
export const GOAL_LABELS = {
  ctt: 'CTT', bbGroup: 'BB group', ab: 'A, B', c: 'C', de: 'D, E', tt: 'TT',
};

export const isLearning = (f) => !f.archive && (f.categorie === 'GBB' || f.categorie === 'IndivBB');
export const toBool = (v) => v === true || v === 'TRUE' || v === 'true' || v === 1;

/** Normalise les valeurs venant de la feuille (booléens, nombres) */
export function normalizeFruit(f) {
  return {
    ...f,
    ctt: toBool(f.ctt),
    archive: toBool(f.archive),
    a_relancer: toBool(f.a_relancer),
    jours: Number(f.jours || 0),
    version: Number(f.version || 1),
  };
}

export const daysSince = (iso) => (!iso ? 0 : Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

/** À relancer : marqué à la main, ou pas de mise à jour depuis 14 jours (apprenants uniquement) */
export const needsFollowUp = (f) =>
  !f.archive && (f.a_relancer || (isLearning(f) && daysSince(f.updated_at) >= 14));

/** Progression par rapport aux objectifs */
export function currentCounts(fruits) {
  const live = fruits.filter((f) => !f.archive);
  const ind = live.filter((f) => f.categorie === 'IndivBB');
  const n = (ls) => ind.filter((f) => ls.includes(f.niveau)).length;
  return {
    ctt: live.filter((f) => f.ctt).length,
    bbGroup: live.filter((f) => f.categorie === 'GBB').length,
    ab: n(['A', 'B']),
    c: n(['C']),
    de: n(['D', 'E']),
    tt: n(['TT']),
  };
}

export function objectivesOf(objectifs, classId) {
  const o = { ...DEFAULT_GOALS };
  objectifs.filter((x) => x.class_id === classId && !String(x.cle).includes('@')).forEach((x) => { o[x.cle] = Number(x.valeur || 0); });
  return o;
}

/** Regroupements pour les vues "Par enseignement" / "Par niveau" (chaque groupe a sa couleur de barre latérale) */
const LEVEL_ORDER = ['A', 'B', 'C', 'D', 'E', 'TT', 'Next', 'Talak'];
export function groupBy(fruits, mode) {
  const map = new Map();
  fruits.forEach((f) => {
    let key;
    if (mode === 'enseignement') key = (f.enseignement || '').trim() || 'Sans enseignement';
    else key = f.categorie === 'NextClass' ? 'Next' : f.categorie === 'Talak' ? 'Talak' : f.niveau || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  });
  const arr = [...map.entries()].map(([key, items]) => {
    const isLevel = mode === 'niveau';
    return {
      key,
      title: isLevel ? (key === 'Next' ? 'Next class' : key === 'Talak' ? 'Talak' : key === '—' ? 'Sans niveau' : `Niveau ${key}`) : key,
      color: isLevel ? (LEVEL_COLORS[key] || { group: '#64748B' }).group : '#4F46E5',
      items,
      days: items.reduce((s, f) => s + Number(f.jours || 0), 0),
    };
  });
  if (mode === 'niveau') arr.sort((a, b) => (LEVEL_ORDER.indexOf(a.key) + 1 || 99) - (LEVEL_ORDER.indexOf(b.key) + 1 || 99));
  else arr.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  return arr;
}

export const sortByName = (arr) => [...arr].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

/* ---------- Form Telegram ---------- */

const line = (f) => `${f.nom}(${f.indoja_nom || ''}/${f.bbt_nom || ''})`;

/** Changements de niveau non encore confirmés (historique sans export_id), un par fruit */
export function pendingLevelChanges(fruits, historique, classId) {
  const byFruit = new Map();
  historique
    .filter((h) => h.class_id === classId && h.champ === 'niveau' && !h.export_id)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
    .forEach((h) => {
      const cur = byFruit.get(h.fruit_id);
      if (cur) cur.nouveau = h.nouveau;
      else byFruit.set(h.fruit_id, { fruit_id: h.fruit_id, ancien: h.ancien, nouveau: h.nouveau });
    });
  const out = [];
  byFruit.forEach((c) => {
    const f = fruits.find((x) => x.id === c.fruit_id);
    if (f && !f.archive && String(c.ancien || '') !== String(c.nouveau || '')) out.push({ ...c, fruit: f });
  });
  return out;
}

export function buildTelegramText(fruits, goals, changes, date = new Date()) {
  const p2 = (n) => String(n).padStart(2, '0');
  const live = fruits.filter((f) => !f.archive);
  const gbb = live.filter((f) => f.categorie === 'GBB');
  const ind = live.filter((f) => f.categorie === 'IndivBB');
  const next = live.filter((f) => f.categorie === 'NextClass');
  const talak = live.filter((f) => f.categorie === 'Talak');
  const L = [];
  L.push(`🗼43${p2(date.getMonth() + 1)}${p2(date.getDate())}_ ${MONTHS_FR[date.getMonth()]} Class`, '');
  L.push(`🔶ESF- ONLINE (${gbb.length + ind.length})`, '');
  L.push('📌Goal :');
  L.push(`❗️CTT : ${goals.ctt}`, `❗️BB group : ${goals.bbGroup}`, `▫️A,B : ${goals.ab}`, `▫️C : ${goals.c}`, `▫️D, E : ${goals.de}`, `▫️TT : ${goals.tt}`, '');
  L.push(`🔹BB Group (${gbb.length})`, '');
  ['A', 'B'].forEach((l) => {
    const m = gbb.filter((f) => f.niveau === l);
    L.push(`🔆Level ${l} (${m.length})`); m.forEach((f) => L.push(line(f))); L.push('');
  });
  L.push(`🔹Individual Educations (${ind.length})`, '');
  ['A', 'B', 'C', 'D', 'E'].forEach((l) => {
    const m = ind.filter((f) => f.niveau === l);
    L.push(`🔆Level ${l} (${m.length})`); m.forEach((f) => L.push(line(f))); L.push('');
  });
  const tt = ind.filter((f) => f.niveau === 'TT');
  L.push(`🔆Ttagui (${tt.length})`); tt.forEach((f) => L.push(line(f))); L.push('');
  L.push(`🔆Level Next (${next.length})`); next.forEach((f) => L.push(line(f))); L.push('');
  L.push(`❌ Talak (${talak.length})`); talak.forEach((f) => L.push(line(f))); L.push('');
  if (changes.length) {
    L.push(`↪️Change (${changes.length})`);
    changes.forEach((c) => L.push(`${line(c.fruit)} (${c.ancien || '—'}) >> (${c.nouveau || '—'})`));
  } else L.push('↪️No change');
  return L.join('\n');
}

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- Excel ---------- */

export function exportExcel(fruits, commentaires, className) {
  const wb = XLSX.utils.book_new();
  CATEGORIES.forEach((cat) => {
    const rows = sortByName(fruits.filter((f) => f.categorie === cat.id && !f.archive)).map((f) => ({
      Nom: f.nom,
      Catégorie: catLabel(f.categorie),
      Niveau: f.niveau || '',
      Format: f.format || '',
      Jours: f.jours,
      CTT: f.ctt ? 'Oui' : '',
      Statut: f.statut || '',
      Enseignement: f.enseignement || '',
      'Indoja - Nom': f.indoja_nom || '',
      'Indoja - Groupe': f.indoja_groupe || '',
      'BBT - Nom': f.bbt_nom || '',
      'BBT - TJN': f.bbt_tjn || '',
      Commentaires: commentaires.filter((c) => c.fruit_id === f.id).map((c) => `${String(c.date).slice(0, 10)} ${c.auteur}: ${c.texte}`).join(' | '),
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Nom: '' }]), cat.label.slice(0, 31));
  });
  XLSX.writeFile(wb, `suivi-fruits-${(className || 'classe').replace(/[^\w-]+/g, '_')}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const CAT_ALIASES = { gbb: 'GBB', 'indiv bb': 'IndivBB', indivbb: 'IndivBB', indiv: 'IndivBB', 'next class': 'NextClass', nextclass: 'NextClass', next: 'NextClass', talak: 'Talak' };

/** Lit un fichier Excel au format de l'export ; renvoie les lignes + erreurs pour l'aperçu */
export async function parseExcel(file, existingNames) {
  const wb = XLSX.read(await file.arrayBuffer());
  const out = [];
  const seen = new Set(existingNames.map((n) => n.trim().toLowerCase()));
  wb.SheetNames.forEach((sn) => {
    XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '' }).forEach((r, i) => {
      const nom = String(r['Nom'] || '').trim();
      if (!nom) return;
      const cat = CAT_ALIASES[String(r['Catégorie'] || sn).trim().toLowerCase()];
      const niveau = String(r['Niveau'] || '').trim().toUpperCase();
      const row = {
        nom, categorie: cat, niveau: cat === 'GBB' || cat === 'IndivBB' ? niveau : '',
        format: /^off/i.test(r['Format']) ? 'Offline' : 'Online',
        jours: Number(r['Jours'] || 0), ctt: /^(oui|1|true|x)/i.test(String(r['CTT'])),
        statut: String(r['Statut'] || ''), enseignement: String(r['Enseignement'] || ''),
        indoja_nom: String(r['Indoja - Nom'] || ''), indoja_groupe: String(r['Indoja - Groupe'] || ''),
        bbt_nom: String(r['BBT - Nom'] || ''), bbt_tjn: String(r['BBT - TJN'] || ''),
      };
      const errors = [];
      if (!cat) errors.push('Catégorie inconnue');
      else if (levelOptionsFor(cat).length && niveau && !levelOptionsFor(cat).includes(niveau)) errors.push('Niveau invalide');
      if (isNaN(row.jours) || row.jours < 0) errors.push('Jours invalides');
      const key = nom.toLowerCase();
      const duplicate = seen.has(key);
      seen.add(key);
      out.push({ ...row, _sheet: sn, _line: i + 2, _errors: errors, _duplicate: duplicate });
    });
  });
  return out;
}

/** Valide un fruit côté front (mêmes règles que l'API) */
export function validateFruit(f) {
  const e = {};
  if (!String(f.nom || '').trim()) e.nom = 'Le nom est obligatoire';
  const j = Number(f.jours);
  if (f.jours === '' || isNaN(j) || j < 0) e.jours = 'Nombre de jours ≥ 0';
  const opts = levelOptionsFor(f.categorie);
  if (opts.length && f.niveau && !opts.includes(f.niveau)) e.niveau = 'Niveau invalide pour cette catégorie';
  return e;
}

/* ---------- Tableau de bord : évolution rebâtie depuis l'historique ---------- */

const DAY = 86400000;
const ms = (iso) => new Date(iso).getTime();

function buildTimeline(fruits, historique) {
  const by = {};
  historique.forEach((h) => { (by[h.fruit_id] = by[h.fruit_id] || []).push(h); });
  return fruits.map((f) => {
    const ev = (by[f.id] || []).filter((e) => ['categorie', 'niveau', 'ctt', 'archivage', 'restauration'].includes(e.champ))
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (f.archive && !ev.some((e) => e.champ === 'archivage')) ev.push({ champ: 'archivage', date: f.archive_le || f.updated_at });
    const first = (k) => ev.find((e) => e.champ === k);
    return {
      ev,
      start: ms(f.created_at || (ev[0] && ev[0].date) || 0),
      cat: first('categorie') ? first('categorie').ancien : f.categorie,
      niv: first('niveau') ? first('niveau').ancien : f.niveau,
      ctt: first('ctt') ? toBool(first('ctt').ancien) : f.ctt,
    };
  });
}

function stateAt(tl, t) {
  if (t < tl.start) return null;
  const s = { cat: tl.cat, niv: tl.niv || '', ctt: tl.ctt, arch: false };
  for (const e of tl.ev) {
    if (ms(e.date) > t) break;
    if (e.champ === 'categorie') s.cat = e.nouveau;
    else if (e.champ === 'niveau') s.niv = e.nouveau || '';
    else if (e.champ === 'ctt') s.ctt = toBool(e.nouveau);
    else if (e.champ === 'archivage') s.arch = true;
    else if (e.champ === 'restauration') s.arch = false;
  }
  return s;
}

export const SERIES_DEFS = [
  { key: 'ab', label: 'A, B', color: '#0D9488' },
  { key: 'c', label: 'C', color: '#6366F1' },
  { key: 'de', label: 'D, E', color: '#A855F7' },
  { key: 'tt', label: 'TT', color: '#F97316' },
  { key: 'bbGroup', label: 'BB group', color: '#0EA5E9' },
  { key: 'ctt', label: 'CTT', color: '#A16207' },
];

export function countsAt(timelines, t) {
  const c = { ab: 0, c: 0, de: 0, tt: 0, bbGroup: 0, ctt: 0, learning: 0 };
  timelines.forEach((tl) => {
    const s = stateAt(tl, t);
    if (!s || s.arch) return;
    if (s.ctt) c.ctt += 1;
    if (s.cat === 'GBB') { c.bbGroup += 1; c.learning += 1; }
    if (s.cat === 'IndivBB') {
      c.learning += 1;
      if (s.niv === 'A' || s.niv === 'B') c.ab += 1;
      else if (s.niv === 'C') c.c += 1;
      else if (s.niv === 'D' || s.niv === 'E') c.de += 1;
      else if (s.niv === 'TT') c.tt += 1;
    }
  });
  return c;
}

/* Objectifs par semaine : clé "<série>@<lundi AAAA-MM-JJ>" dans l'onglet objectifs */
export function mondayKey(t) {
  const d = new Date(t);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function weekPoints(weeks = 7, now = Date.now()) {
  return Array.from({ length: weeks }, (_, i) => {
    const t = now - (weeks - 1 - i) * 7 * DAY;
    const d = new Date(t);
    return { t, key: mondayKey(t), label: `${d.getDate()} ${MONTHS_FR[d.getMonth()].toLowerCase()}` };
  });
}
export const linearTarget = (goal, i, weeks = 7) => Math.round((Number(goal || 0) * (i + 1)) / weeks);
export function weeklyGoalsOf(objectifs, classId) {
  const o = {};
  objectifs.filter((x) => x.class_id === classId && String(x.cle).includes('@')).forEach((x) => { o[x.cle] = Number(x.valeur); });
  return o;
}

/** 7 points hebdomadaires (le dernier = aujourd'hui) pour chaque série ; objectif = cible saisie pour la semaine, sinon progression linéaire */
export function weeklySeries(fruits, historique, goals, weekly = {}, weeks = 7, now = Date.now()) {
  const tls = buildTimeline(fruits, historique);
  const pts = weekPoints(weeks, now);
  const counts = pts.map((p) => countsAt(tls, p.t));
  const series = SERIES_DEFS.map((d) => ({
    ...d,
    real: counts.map((c) => c[d.key]),
    obj: pts.map((p, i) => (weekly[`${d.key}@${p.key}`] !== undefined ? weekly[`${d.key}@${p.key}`] : linearTarget(goals[d.key], i, weeks))),
  }));
  return { labels: pts.map((p) => p.label), series, learningNow: counts[weeks - 1].learning, learningBefore: counts[weeks - 2].learning };
}

export const LEVEL_KEYS = ['A', 'B', 'C', 'D', 'E', 'TT', 'Next', 'Talak'];
export function levelDistribution(fruits) {
  const live = fruits.filter((f) => !f.archive);
  const out = Object.fromEntries(LEVEL_KEYS.map((k) => [k, 0]));
  live.forEach((f) => {
    const k = f.categorie === 'NextClass' ? 'Next' : f.categorie === 'Talak' ? 'Talak' : f.niveau;
    if (k in out) out[k] += 1;
  });
  return out;
}

export function recentLevelChanges(fruits, historique, classId, limit = 6) {
  return historique
    .filter((h) => h.class_id === classId && h.champ === 'niveau' && (h.ancien || h.nouveau))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .map((h) => ({ ...h, fruit: fruits.find((f) => f.id === h.fruit_id) }))
    .filter((h) => h.fruit && !h.fruit.archive)
    .slice(0, limit);
}

/** Mises à jour + commentaires des 7 derniers jours, par auteur */
export function teamActivity(fruits, historique, commentaires, now = Date.now()) {
  const ids = new Set(fruits.map((f) => f.id));
  const since = now - 7 * DAY;
  const n = {};
  [...historique, ...commentaires].forEach((x) => {
    if (!ids.has(x.fruit_id) || !x.auteur || ms(x.date) < since) return;
    n[x.auteur] = (n[x.auteur] || 0) + 1;
  });
  return Object.entries(n).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}
