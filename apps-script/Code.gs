/**
 * Suivi des fruits — API Google Apps Script
 * À coller dans Extensions > Apps Script du Google Sheet, puis :
 *   1) exécuter la fonction setup() une fois (autorisations)
 *   2) Déployer > Nouveau déploiement > Application Web
 *      Exécuter en tant que : Moi / Accès : Tout le monde
 *
 * Le front envoie des POST en text/plain (évite le préflight CORS) :
 *   { code, user, action, payload }
 */

var TABLES = {
  classes: ['id', 'nom', 'date_debut', 'archivee', 'updated_at'],
  fruits: ['id', 'class_id', 'nom', 'categorie', 'niveau', 'format', 'jours', 'statut', 'ctt',
    'enseignement', 'indoja_nom', 'indoja_groupe', 'bbt_nom', 'bbt_tjn', 'a_relancer',
    'archive', 'archive_le', 'version', 'created_at', 'updated_at', 'updated_by'],
  commentaires: ['id', 'fruit_id', 'auteur', 'date', 'texte', 'updated_at'],
  historique: ['id', 'fruit_id', 'class_id', 'date', 'auteur', 'champ', 'ancien', 'nouveau', 'export_id'],
  objectifs: ['class_id', 'cle', 'valeur'],
  exports: ['id', 'class_id', 'date', 'auteur', 'type', 'snapshot'],
  reglages: ['cle', 'valeur']
};

var CATEGORIES = ['GBB', 'IndivBB', 'NextClass', 'Talak'];
var FORMATS = ['Online', 'Offline'];

/* ---------- Installation ---------- */

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(TABLES).forEach(function (name) {
    var sh = ss.getSheetByName(name) || ss.insertSheet(name);
    var cols = TABLES[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#FEF3C7');
    sh.setFrozenRows(1);
  });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Feuille 1');
  if (def && ss.getSheets().length > 1) ss.deleteSheet(def);

  var reg = ss.getSheetByName('reglages');
  if (reg.getLastRow() < 2) {
    reg.getRange(2, 1, 1, 2).setValues([['code_equipe', 'CHANGE-MOI']]);
  }
  // Rôles : ajoute les lignes manquantes sans toucher à l'existant
  [['code_admin', 'CHANGE-MOI-ADMIN'], ['code_lecture', ''], ['lecteurs', '']].forEach(function (kv) {
    var found = readAll_('reglages').some(function (r) { return r.cle === kv[0]; });
    if (!found) appendRow_('reglages', { cle: kv[0], valeur: kv[1] });
  });
  var cl = ss.getSheetByName('classes');
  if (cl.getLastRow() < 2) {
    cl.getRange(2, 1, 1, 5).setValues([[Utilities.getUuid(), 'Classe de Sept. 2026', '2026-09-01', false, now_()]]);
  }
  SpreadsheetApp.getUi && SpreadsheetApp.getActiveSpreadsheet().toast('Feuilles créées. Pense à changer code_equipe et code_admin dans l\'onglet reglages.');
}

/* ---------- Point d'entrée ---------- */

function doGet() {
  return json_({ ok: true, message: 'API Suivi des fruits en ligne' });
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Requête invalide' }); }

  var user = String(req.user || '').trim();
  var role = roleOf_(String(req.code || ''), user);
  if (!role) return json_({ ok: false, error: 'CODE_INVALIDE' });
  if (!user) return json_({ ok: false, error: 'Nom manquant' });

  var a = req.action, p = req.payload || {};
  try {
    if (a === 'ping') return json_({ ok: true, counter: counter_(), role: role });
    if (a === 'counter') return json_({ ok: true, counter: counter_(), role: role });
    if (a === 'load') return json_({ ok: true, data: loadAll_(), counter: counter_(), role: role });
    if (a === 'getReaders') {
      if (role !== 'admin') return json_({ ok: false, error: 'ADMIN_REQUIS' });
      return json_({ ok: true, result: readers_(), counter: counter_(), role: role });
    }

    // Écritures : refusées pour les lecteurs, côté serveur
    if (role === 'lecture') return json_({ ok: false, error: 'LECTURE_SEULE' });
    if (a === 'setReaders' && role !== 'admin') return json_({ ok: false, error: 'ADMIN_REQUIS' });

    // Toutes les écritures passent par le verrou
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return json_({ ok: false, error: 'OCCUPE' });
    try {
      var res = write_(a, p, user);
      bump_();
      return json_({ ok: true, result: res, counter: counter_(), role: role });
    } finally { lock.releaseLock(); }
  } catch (err) {
    if (err && err.conflict) return json_({ ok: false, error: 'CONFLIT', current: err.current });
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- Écritures ---------- */

function write_(a, p, user) {
  switch (a) {
    case 'saveFruit': return saveFruit_(p, user);
    case 'archiveFruits': return setArchive_(p.ids, true, user);
    case 'restoreFruits': return setArchive_(p.ids, false, user);
    case 'deleteFruits': return deleteFruits_(p.ids);
    case 'bulkUpdate': return bulkUpdate_(p, user);
    case 'importFruits': return importFruits_(p, user);
    case 'addComment': return addComment_(p, user);
    case 'editComment': return editComment_(p);
    case 'deleteComment': deleteRows_('commentaires', 'id', [p.id]); return true;
    case 'saveClass': return saveClass_(p);
    case 'setObjectives': return setObjectives_(p);
    case 'confirmExport': return confirmExport_(p, user);
    case 'transferFruits': return transferFruits_(p, user);
    case 'setReaders': return setReaders_(p);
    default: throw new Error('Action inconnue : ' + a);
  }
}

function saveFruit_(f, user) {
  validate_(f);
  var t = now_();
  var rows = readAll_('fruits');
  var existing = f.id ? rows.filter(function (r) { return r.id === f.id; })[0] : null;

  if (existing) {
    // Concurrence optimiste : on compare la version envoyée à la version actuelle
    if (Number(f.version) !== Number(existing.version)) {
      var c = new Error('conflit'); c.conflict = true; c.current = existing; throw c;
    }
    var changes = [];
    ['categorie', 'niveau', 'ctt'].forEach(function (k) {
      if (String(existing[k] === undefined ? '' : existing[k]).toLowerCase() !== String(f[k] === undefined ? '' : f[k]).toLowerCase()) changes.push([k, existing[k], f[k]]);
    });
    var upd = merge_(existing, f);
    upd.version = Number(existing.version) + 1;
    upd.updated_at = t; upd.updated_by = user;
    updateRow_('fruits', 'id', upd);
    changes.forEach(function (c) { addHistory_(upd.id, upd.class_id, user, c[0], c[1], c[2]); });
    return upd;
  }
  var n = merge_({}, f);
  n.id = Utilities.getUuid();
  n.version = 1; n.archive = false; n.created_at = t; n.updated_at = t; n.updated_by = user;
  appendRow_('fruits', n);
  addHistory_(n.id, n.class_id, user, 'creation', '', n.categorie + ' ' + (n.niveau || ''));
  return n;
}

function bulkUpdate_(p, user) {
  var t = now_(), out = [];
  var rows = readAll_('fruits');
  p.ids.forEach(function (id) {
    var r = rows.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    ['categorie', 'niveau'].forEach(function (k) {
      if (p.changes[k] !== undefined && String(r[k] || '') !== String(p.changes[k] || '')) {
        addHistory_(r.id, r.class_id, user, k, r[k], p.changes[k]);
      }
    });
    var u = merge_(r, p.changes);
    validate_(u);
    u.version = Number(r.version) + 1; u.updated_at = t; u.updated_by = user;
    updateRow_('fruits', 'id', u); out.push(u);
  });
  return out;
}

function setArchive_(ids, flag, user) {
  var t = now_();
  var rows = readAll_('fruits');
  ids.forEach(function (id) {
    var r = rows.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    r.archive = flag; r.archive_le = flag ? t : '';
    r.version = Number(r.version) + 1; r.updated_at = t; r.updated_by = user;
    updateRow_('fruits', 'id', r);
    addHistory_(r.id, r.class_id, user, flag ? 'archivage' : 'restauration', '', '');
  });
  return true;
}

function deleteFruits_(ids) {
  deleteRows_('fruits', 'id', ids);
  deleteRows_('commentaires', 'fruit_id', ids);
  deleteRows_('historique', 'fruit_id', ids);
  return true;
}

function importFruits_(p, user) {
  var t = now_(), created = [];
  p.rows.forEach(function (f) {
    f.class_id = p.class_id;
    validate_(f);
    var n = merge_({}, f);
    n.id = Utilities.getUuid(); n.version = 1; n.archive = false;
    n.created_at = t; n.updated_at = t; n.updated_by = user;
    appendRow_('fruits', n);
    addHistory_(n.id, n.class_id, user, 'creation', '', n.categorie + ' ' + (n.niveau || ''));
    created.push(n);
  });
  return created;
}

function addComment_(p, user) {
  var c = { id: Utilities.getUuid(), fruit_id: p.fruit_id, auteur: user, date: now_(), texte: String(p.texte || '').trim(), updated_at: now_() };
  if (!c.texte) throw new Error('Commentaire vide');
  appendRow_('commentaires', c);
  return c;
}

function editComment_(p) {
  var rows = readAll_('commentaires');
  var r = rows.filter(function (x) { return x.id === p.id; })[0];
  if (!r) throw new Error('Commentaire introuvable');
  r.texte = String(p.texte || '').trim(); r.updated_at = now_();
  updateRow_('commentaires', 'id', r);
  return r;
}

function saveClass_(p) {
  var rows = readAll_('classes');
  var r = p.id ? rows.filter(function (x) { return x.id === p.id; })[0] : null;
  if (r) { var u = merge_(r, p); u.updated_at = now_(); updateRow_('classes', 'id', u); return u; }
  var n = merge_({}, p); n.id = Utilities.getUuid(); n.archivee = false; n.updated_at = now_();
  appendRow_('classes', n); return n;
}

function setObjectives_(p) {
  deleteRows_('objectifs', 'class_id', [p.class_id]);
  Object.keys(p.values).forEach(function (k) {
    appendRow_('objectifs', { class_id: p.class_id, cle: k, valeur: p.values[k] });
  });
  return true;
}

/** Confirme l'export Telegram : fige les niveaux (snapshot) et marque les changements comme exportés. */
function confirmExport_(p, user) {
  var id = Utilities.getUuid();
  appendRow_('exports', { id: id, class_id: p.class_id, date: now_(), auteur: user, type: 'telegram', snapshot: JSON.stringify(p.snapshot || {}) });
  var h = readAll_('historique');
  h.forEach(function (r) {
    if (r.class_id === p.class_id && r.champ === 'niveau' && !r.export_id) { r.export_id = id; updateRow_('historique', 'id', r); }
  });
  return id;
}

/** Passe des fruits dans une autre classe (copie ou déplacement), avec ou sans commentaires. */
function transferFruits_(p, user) {
  var t = now_(), out = [];
  var rows = readAll_('fruits');
  var coms = readAll_('commentaires');
  p.ids.forEach(function (id) {
    var r = rows.filter(function (x) { return x.id === id; })[0];
    if (!r) return;
    var fromClass = r.class_id;
    var patch = {};
    if (p.changes) Object.keys(p.changes).forEach(function (k) { patch[k] = p.changes[k]; });
    if (p.mode === 'move') {
      var u = merge_(r, patch);
      u.class_id = p.to_class_id; u.version = Number(r.version) + 1; u.updated_at = t; u.updated_by = user;
      validate_(u);
      updateRow_('fruits', 'id', u);
      // l'historique suit le fruit
      var h = readAll_('historique');
      h.forEach(function (x) { if (x.fruit_id === id) { x.class_id = p.to_class_id; updateRow_('historique', 'id', x); } });
      addHistory_(id, p.to_class_id, user, 'transfert', fromClass, p.to_class_id);
      out.push(u);
    } else {
      var n = merge_(r, patch);
      n.id = Utilities.getUuid(); n.class_id = p.to_class_id; n.version = 1; n.archive = false; n.archive_le = '';
      n.created_at = t; n.updated_at = t; n.updated_by = user;
      validate_(n);
      appendRow_('fruits', n);
      addHistory_(n.id, n.class_id, user, 'creation', '', n.categorie + ' ' + (n.niveau || '') + ' (copie)');
      if (p.withComments) {
        coms.filter(function (c) { return c.fruit_id === id; }).forEach(function (c) {
          appendRow_('commentaires', { id: Utilities.getUuid(), fruit_id: n.id, auteur: c.auteur, date: c.date, texte: c.texte, updated_at: t });
        });
      }
      out.push(n);
    }
  });
  return out;
}

/* ---------- Rôles ---------- */

/** admin = code_admin ; lecture = code_lecture ou nom dans « lecteurs » ; sinon équipe (lecture + écriture). */
function roleOf_(code, user) {
  code = code.trim();
  var admin = String(getSetting_('code_admin') || '').trim();
  if (admin && code === admin) return 'admin';
  var team = String(getSetting_('code_equipe') || '').trim();
  var ro = String(getSetting_('code_lecture') || '').trim();
  if (ro && code === ro) return 'lecture';
  if (code === team) return readers_().indexOf(user.toLowerCase()) >= 0 ? 'lecture' : 'equipe';
  return '';
}

function readers_() {
  return String(getSetting_('lecteurs') || '').split(',').map(function (s) { return s.trim().toLowerCase(); }).filter(Boolean);
}

function setReaders_(p) {
  var v = (p.names || []).map(function (s) { return String(s).trim(); }).filter(Boolean).join(', ');
  var sh = sheet_('reglages'), n = sh.getLastRow() - 1;
  var keys = n > 0 ? sh.getRange(2, 1, n, 1).getValues() : [];
  for (var i = 0; i < keys.length; i++) {
    if (keys[i][0] === 'lecteurs') { sh.getRange(i + 2, 2).setValue(v); return true; }
  }
  appendRow_('reglages', { cle: 'lecteurs', valeur: v });
  return true;
}

/* ---------- Lecture ---------- */

function loadAll_() {
  var cache = CacheService.getScriptCache();
  var key = 'load_' + counter_();
  var hit = cache.get(key);
  if (hit) return JSON.parse(hit);
  var data = {
    classes: readAll_('classes'),
    fruits: readAll_('fruits'),
    commentaires: readAll_('commentaires'),
    historique: readAll_('historique'),
    objectifs: readAll_('objectifs'),
    exports: readAll_('exports')
  };
  try { cache.put(key, JSON.stringify(data), 60); } catch (e) { /* >100 Ko : pas de cache */ }
  return data;
}

/* ---------- Validation ---------- */

function validate_(f) {
  if (!String(f.nom || '').trim()) throw new Error('Le nom est obligatoire');
  if (CATEGORIES.indexOf(f.categorie) < 0) throw new Error('Catégorie invalide');
  if (f.format && FORMATS.indexOf(f.format) < 0) throw new Error('Format invalide');
  var j = Number(f.jours || 0);
  if (isNaN(j) || j < 0) throw new Error('Nombre de jours invalide');
  var gbb = ['A', 'B'], ind = ['A', 'B', 'C', 'D', 'E', 'TT'];
  if (f.categorie === 'GBB' && f.niveau && gbb.indexOf(f.niveau) < 0) throw new Error('Niveau GBB : A ou B');
  if (f.categorie === 'IndivBB' && f.niveau && ind.indexOf(f.niveau) < 0) throw new Error('Niveau Indiv BB invalide');
  if ((f.categorie === 'NextClass' || f.categorie === 'Talak') && f.niveau) f.niveau = '';
}

/* ---------- Outils feuille ---------- */

function sheet_(name) { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }

function readAll_(name) {
  var sh = sheet_(name), cols = TABLES[name];
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var vals = sh.getRange(2, 1, n, cols.length).getValues();
  return vals.map(function (row) {
    var o = {};
    cols.forEach(function (c, i) {
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss");
      o[c] = v;
    });
    return o;
  });
}

function rowValues_(name, o) {
  return TABLES[name].map(function (c) { return o[c] === undefined || o[c] === null ? '' : o[c]; });
}

function appendRow_(name, o) {
  var sh = sheet_(name);
  sh.getRange(sh.getLastRow() + 1, 1, 1, TABLES[name].length).setValues([rowValues_(name, o)]);
}

function updateRow_(name, keyCol, o) {
  var sh = sheet_(name), cols = TABLES[name], k = cols.indexOf(keyCol);
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var keys = sh.getRange(2, k + 1, n, 1).getValues();
  for (var i = 0; i < keys.length; i++) {
    if (String(keys[i][0]) === String(o[keyCol])) {
      sh.getRange(i + 2, 1, 1, cols.length).setValues([rowValues_(name, o)]);
      return;
    }
  }
}

function deleteRows_(name, keyCol, values) {
  var sh = sheet_(name), cols = TABLES[name], k = cols.indexOf(keyCol);
  var n = sh.getLastRow() - 1;
  if (n < 1) return;
  var keys = sh.getRange(2, k + 1, n, 1).getValues();
  for (var i = keys.length - 1; i >= 0; i--) {
    if (values.indexOf(String(keys[i][0])) >= 0) sh.deleteRow(i + 2);
  }
}

function merge_(base, patch) {
  var o = {};
  Object.keys(base).forEach(function (k) { o[k] = base[k]; });
  Object.keys(patch).forEach(function (k) {
    if (k === 'version' || (k === 'id' && o.id)) return;
    o[k] = patch[k];
  });
  return o;
}

function addHistory_(fruitId, classId, user, champ, ancien, nouveau) {
  appendRow_('historique', { id: Utilities.getUuid(), fruit_id: fruitId, class_id: classId, date: now_(), auteur: user, champ: champ, ancien: ancien, nouveau: nouveau, export_id: '' });
}

function getSetting_(key) {
  var rows = readAll_('reglages');
  for (var i = 0; i < rows.length; i++) if (rows[i].cle === key) return rows[i].valeur;
  return '';
}

function now_() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ss"); }

/* Compteur global de modifications (le front l'interroge toutes les 20 s) */
function counter_() { return Number(PropertiesService.getScriptProperties().getProperty('counter') || 0); }
function bump_() { PropertiesService.getScriptProperties().setProperty('counter', String(counter_() + 1)); }

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
