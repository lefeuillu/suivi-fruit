// Client API : Google Apps Script (réel) ou mode démo local (si VITE_API_URL est vide)
const URL_API = import.meta.env.VITE_API_URL || '';
export const DEMO = !URL_API;

const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowIso = () => new Date().toISOString().slice(0, 19);

export class ApiError extends Error {
  constructor(code, extra) { super(code); this.code = code; Object.assign(this, extra); }
}

export async function callApi(creds, action, payload) {
  if (DEMO) return demoCall(creds, action, payload || {});
  let res;
  try {
    res = await fetch(URL_API, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // évite le préflight CORS
      body: JSON.stringify({ code: creds.code, user: creds.user, action, payload }),
    });
  } catch {
    throw new ApiError('RESEAU');
  }
  let json;
  try { json = await res.json(); } catch { throw new ApiError('REPONSE_INVALIDE'); }
  if (!json.ok) throw new ApiError(json.error || 'ERREUR', { current: json.current });
  return json;
}

/* ================= Mode démo (localStorage) ================= */

const KEY = 'suivi-fruits-demo-v3';

function seed() {
  const cid = 'demo-classe';
  const ago = (d) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 19);
  const mk = (o, created, updated) => ({ id: uuid(), class_id: cid, format: 'Offline', jours: 0, statut: '', ctt: false, enseignement: '', indoja_nom: '', indoja_groupe: '', bbt_nom: '', bbt_tjn: '', a_relancer: false, archive: false, version: 1, created_at: ago(created), updated_at: ago(updated ?? 1), updated_by: 'Démo', niveau: '', ...o });
  const Y = mk({ nom: 'Yann', categorie: 'GBB', niveau: 'A', jours: 21, statut: "Présent à l'EM, a bien reçu la parole", enseignement: 'Les notions basiques de la Bible P2', indoja_nom: 'Adele', indoja_groupe: 'CT', bbt_nom: 'Moba', bbt_tjn: 'Marc', ctt: true }, 44, 1);
  const N = mk({ nom: 'Nouveau', categorie: 'GBB', niveau: 'A', jours: 19, statut: 'A répondu à BBT, va bien', enseignement: 'Les notions basiques de la Bible P2', indoja_nom: 'Eloïse', indoja_groupe: 'MOI', bbt_nom: 'Paul', bbt_tjn: 'Eli' }, 40, 2);
  const F = mk({ nom: 'Fleur', categorie: 'GBB', niveau: 'B', jours: 16, statut: "BBT n'a pas contacté le fruit", enseignement: 'Les notions basiques de la Bible P2', indoja_nom: 'Franck', indoja_groupe: 'TOIT', bbt_nom: 'Lili', bbt_tjn: 'Eli', a_relancer: true }, 36, 28);
  const E = mk({ nom: 'Ex', categorie: 'IndivBB', niveau: 'B', jours: 7, statut: 'Retourné à Toulouse', enseignement: '4 champs', indoja_nom: 'Lora', indoja_groupe: 'JK', bbt_nom: 'Eloya', bbt_tjn: 'Eli', format: 'Online' }, 30, 22);
  const P = mk({ nom: 'Epri', categorie: 'IndivBB', niveau: 'B', jours: 7, statut: 'Révision faite, sans-faute', enseignement: 'Révision investissement spirituel', indoja_nom: 'Fanny', indoja_groupe: 'JK', bbt_nom: 'Henri', bbt_tjn: 'Eli' }, 29, 3);
  const A = mk({ nom: 'Affaire', categorie: 'IndivBB', niveau: 'C', jours: 8, statut: 'BBT va parler clairement au fruit', enseignement: 'La Bible est le livre de la promesse', indoja_nom: 'Renard', indoja_groupe: 'JK', bbt_nom: 'Songli', bbt_tjn: 'Marc' }, 22, 9);
  const B = mk({ nom: 'Barbie', categorie: 'IndivBB', niveau: 'C', jours: 6, statut: 'Assistera à sa première leçon GBB', enseignement: 'La prière exaucée', indoja_nom: 'Jean', indoja_groupe: 'LNV', bbt_nom: 'Coco', bbt_tjn: 'Jonas' }, 15, 6);
  const T = mk({ nom: 'Blabla', categorie: 'Talak', jours: 1, statut: 'Situation inchangée', enseignement: 'Construire le temple', indoja_nom: 'Glo', indoja_groupe: 'CC', bbt_nom: 'Nana', bbt_tjn: 'Marc' }, 34, 8);
  const M = mk({ nom: 'Marin de Dieu', categorie: 'NextClass', statut: 'Pas prêt pour cette rentrée', indoja_nom: 'Fabio', bbt_nom: 'Kadi' }, 12, 10);
  const fruits = [Y, N, F, E, P, A, B, T, M];
  const historique = [];
  const h = (f, d, auteur, champ, ancien, nouveau, exp = 'seed') => historique.push({ id: uuid(), fruit_id: f.id, class_id: cid, date: ago(d), auteur, champ, ancien, nouveau, export_id: exp });
  fruits.forEach((f) => h(f, Math.round((Date.now() - new Date(f.created_at)) / 86400000), 'Léa', 'creation', '', f.categorie));
  h(Y, 15, 'Inès', 'ctt', false, true);
  h(P, 20, 'Yanis', 'niveau', 'A', 'B');
  h(F, 12, 'Inès', 'niveau', 'A', 'B');
  h(T, 8, 'Léa', 'categorie', 'IndivBB', 'Talak'); h(T, 8, 'Léa', 'niveau', 'E', '');
  h(A, 9, 'Yanis', 'niveau', 'B', 'C', '');
  h(B, 6, 'Malik', 'categorie', 'GBB', 'IndivBB'); h(B, 6, 'Malik', 'niveau', 'A', 'C', '');
  const cm = (f, d, auteur, texte) => ({ id: uuid(), fruit_id: f.id, auteur, date: ago(d), texte, updated_at: ago(d) });
  return {
    counter: 1, code: 'demo',
    classes: [{ id: cid, nom: 'Classe de Sept. 2026', date_debut: '2026-09-01', archivee: false }],
    fruits, historique, exports: [],
    commentaires: [cm(Y, 1, 'Léa', 'Présent à la réunion, a bien reçu la parole.'), cm(N, 2, 'Inès', 'A répondu à BBT, tout va bien.'), cm(P, 3, 'Léa', 'Révision faite, sans-faute sur le verset.'), cm(A, 5, 'Sarah', 'BBT va le rencontrer.')],
    objectifs: [['ctt', 2], ['bbGroup', 5], ['ab', 6], ['c', 3], ['de', 2], ['tt', 1]].map(([cle, valeur]) => ({ class_id: cid, cle, valeur })),
  };
}

let mem = null; // repli en mémoire si le stockage du navigateur est indisponible
function db() {
  if (mem) return mem;
  try { const s = localStorage.getItem(KEY); if (s) { mem = JSON.parse(s); return mem; } } catch { /* ignore */ }
  mem = seed(); save(mem); return mem;
}
function save(d) { mem = d; try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* ignore */ } }

async function demoCall(creds, action, p) {
  await new Promise((r) => setTimeout(r, 120));
  const d = db();
  // Codes de démo : demo = équipe, admin = administrateur, lecture = lecture seule
  const readers = d.readers || [];
  const code = String(creds.code || '').trim();
  const role = code === 'admin' ? 'admin' : code === 'lecture' ? 'lecture' : code === d.code ? (readers.includes(String(creds.user || '').trim().toLowerCase()) ? 'lecture' : 'equipe') : '';
  if (!role) throw new ApiError('CODE_INVALIDE');
  if (action === 'ping' || action === 'counter') return { ok: true, counter: d.counter, role };
  if (action === 'load') {
    const { counter, code: _c, readers: _r, ...data } = d;
    return { ok: true, data, counter, role };
  }
  if (action === 'getReaders') {
    if (role !== 'admin') throw new ApiError('ADMIN_REQUIS');
    return { ok: true, result: readers, counter: d.counter, role };
  }
  if (role === 'lecture') throw new ApiError('LECTURE_SEULE');
  if (action === 'setReaders' && role !== 'admin') throw new ApiError('ADMIN_REQUIS');
  const t = nowIso();
  const hist = (f, champ, ancien, nouveau) => d.historique.push({ id: uuid(), fruit_id: f.id, class_id: f.class_id, date: t, auteur: creds.user, champ, ancien, nouveau, export_id: '' });
  let result = true;
  switch (action) {
    case 'saveFruit': {
      const ex = p.id && d.fruits.find((f) => f.id === p.id);
      if (ex) {
        if (Number(p.version) !== Number(ex.version)) throw new ApiError('CONFLIT', { current: ex });
        ['categorie', 'niveau', 'ctt'].forEach((k) => { if (String(ex[k] ?? '') !== String(p[k] ?? '')) hist(ex, k, ex[k], p[k]); });
        Object.assign(ex, p, { version: ex.version + 1, updated_at: t, updated_by: creds.user });
        result = ex;
      } else {
        const n = { ...p, id: uuid(), version: 1, archive: false, created_at: t, updated_at: t, updated_by: creds.user };
        d.fruits.push(n); hist(n, 'creation', '', n.categorie + ' ' + (n.niveau || '')); result = n;
      }
      break;
    }
    case 'bulkUpdate':
      result = p.ids.map((id) => {
        const f = d.fruits.find((x) => x.id === id); if (!f) return null;
        ['categorie', 'niveau'].forEach((k) => { if (p.changes[k] !== undefined && (f[k] || '') !== (p.changes[k] || '')) hist(f, k, f[k], p.changes[k]); });
        Object.assign(f, p.changes, { version: f.version + 1, updated_at: t, updated_by: creds.user }); return f;
      }).filter(Boolean);
      break;
    case 'archiveFruits': case 'restoreFruits':
      p.ids.forEach((id) => { const f = d.fruits.find((x) => x.id === id); if (f) { f.archive = action === 'archiveFruits'; f.archive_le = f.archive ? t : ''; f.version += 1; f.updated_at = t; hist(f, f.archive ? 'archivage' : 'restauration', '', ''); } });
      break;
    case 'deleteFruits':
      d.fruits = d.fruits.filter((f) => !p.ids.includes(f.id));
      d.commentaires = d.commentaires.filter((c) => !p.ids.includes(c.fruit_id));
      d.historique = d.historique.filter((h) => !p.ids.includes(h.fruit_id));
      break;
    case 'importFruits':
      result = p.rows.map((r) => { const n = { ...r, class_id: p.class_id, id: uuid(), version: 1, archive: false, created_at: t, updated_at: t, updated_by: creds.user }; d.fruits.push(n); hist(n, 'creation', '', n.categorie); return n; });
      break;
    case 'addComment': result = { id: uuid(), fruit_id: p.fruit_id, auteur: creds.user, date: t, texte: p.texte, updated_at: t }; d.commentaires.push(result); break;
    case 'editComment': { const c = d.commentaires.find((x) => x.id === p.id); if (c) { c.texte = p.texte; c.updated_at = t; } result = c; break; }
    case 'deleteComment': d.commentaires = d.commentaires.filter((c) => c.id !== p.id); break;
    case 'saveClass': {
      const c = p.id && d.classes.find((x) => x.id === p.id);
      if (c) Object.assign(c, p); else { result = { ...p, id: uuid(), archivee: false }; d.classes.push(result); }
      break;
    }
    case 'setObjectives':
      d.objectifs = d.objectifs.filter((o) => o.class_id !== p.class_id).concat(Object.entries(p.values).map(([cle, valeur]) => ({ class_id: p.class_id, cle, valeur })));
      break;
    case 'confirmExport': {
      const id = uuid();
      d.exports.push({ id, class_id: p.class_id, date: t, auteur: creds.user, type: 'telegram', snapshot: JSON.stringify(p.snapshot || {}) });
      d.historique.forEach((h) => { if (h.class_id === p.class_id && h.champ === 'niveau' && !h.export_id) h.export_id = id; });
      result = id; break;
    }
    case 'transferFruits': {
      result = [];
      p.ids.forEach((id) => {
        const f = d.fruits.find((x) => x.id === id); if (!f) return;
        if (p.mode === 'move') {
          const from = f.class_id;
          Object.assign(f, p.changes || {}, { class_id: p.to_class_id, version: f.version + 1, updated_at: t, updated_by: creds.user });
          d.historique.forEach((h) => { if (h.fruit_id === id) h.class_id = p.to_class_id; });
          hist(f, 'transfert', from, p.to_class_id); result.push(f);
        } else {
          const n = { ...f, ...(p.changes || {}), id: uuid(), class_id: p.to_class_id, version: 1, archive: false, archive_le: '', created_at: t, updated_at: t, updated_by: creds.user };
          d.fruits.push(n); hist(n, 'creation', '', n.categorie + ' ' + (n.niveau || '') + ' (copie)');
          if (p.withComments) d.commentaires.filter((c) => c.fruit_id === id).forEach((c) => d.commentaires.push({ ...c, id: uuid(), fruit_id: n.id, updated_at: t }));
          result.push(n);
        }
      });
      break;
    }
    case 'setReaders': d.readers = (p.names || []).map((s) => String(s).trim().toLowerCase()).filter(Boolean); break;
    default: throw new ApiError('Action inconnue');
  }
  d.counter += 1;
  save(d);
  return { ok: true, result, counter: d.counter, role };
}
