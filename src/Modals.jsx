import { useMemo, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { Sheet, Confirm, Field, input } from './ui';
import { T, catLabel } from './theme';
import { buildTelegramText, pendingLevelChanges, parseExcel, downloadBlob, GOAL_LABELS, currentCounts, weekPoints, weeklyGoalsOf, linearTarget, objectivesOf, DEFAULT_GOALS, SERIES_DEFS } from './logic';
import { errorText } from './useStore';

/* ---------- Form Telegram ---------- */
export function TelegramModal({ store, classFruits, goals, classId, onClose }) {
  const changes = useMemo(() => pendingLevelChanges(classFruits, store.data.historique, classId), [classFruits, store.data.historique, classId]);
  const text = useMemo(() => buildTelegramText(classFruits, goals, changes), [classFruits, goals, changes]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const stamp = new Date().toISOString().slice(0, 10);

  async function copy() {
    try { await navigator.clipboard.writeText(text); store.notify('Texte copié'); } catch { store.notify('Copie impossible, utilise le téléchargement', 'err'); }
  }
  async function share() {
    if (navigator.share) { try { await navigator.share({ text }); } catch { /* annulé */ } } else copy();
  }
  async function confirm() {
    setBusy(true);
    try {
      const snap = {}; classFruits.forEach((f) => { snap[f.id] = f.niveau || ''; });
      await store.confirmExport(snap);
      setConfirmed(true);
      store.notify(changes.length ? 'Export confirmé : changements enregistrés' : 'Export confirmé');
    } catch (e) { store.notify(errorText(e), 'err'); } finally { setBusy(false); }
  }

  return (
    <Sheet title="Form Telegram" onClose={onClose} wide footer={<>
      <button className="btn-ghost" onClick={copy}>Copier</button>
      <button className="btn-ghost" onClick={share}>Partager</button>
      <button className="btn-ghost" onClick={() => downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `form-telegram-${stamp}.txt`)}>Télécharger .txt</button>
      {!store.readOnly && <button className="btn-primary" disabled={busy || confirmed} onClick={confirm}>{confirmed ? 'Export confirmé ✓' : "Confirmer l'export"}</button>}
    </>}>
      <p className="modals-1">
        {changes.length ? `${changes.length} changement(s) de niveau depuis le dernier export confirmé.` : 'Aucun changement de niveau depuis le dernier export.'}{' '}
        Les changements ne sont marqués comme exportés qu'après « Confirmer l'export ».
      </p>
      <pre className="modals-2">{text}</pre>
    </Sheet>
  );
}

/* ---------- Import Excel ---------- */
export function ImportModal({ store, classFruits, onClose }) {
  const [rows, setRows] = useState(null);
  const [skipDup, setSkipDup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function pick(e) {
    const file = e.target.files[0]; if (!file) return;
    try { setRows(await parseExcel(file, classFruits.map((f) => f.nom))); setErr(''); } catch { setErr('Fichier illisible.'); }
  }
  const valid = (rows || []).filter((r) => !r._errors.length && !(skipDup && r._duplicate));
  async function go() {
    setBusy(true);
    try {
      const clean = valid.map(({ _sheet, _line, _errors, _duplicate, ...r }) => r);
      await store.importRows(clean);
      store.notify(`${clean.length} fruit(s) importé(s)`);
      onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Sheet title="Importer un Excel" onClose={onClose} wide footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" disabled={!valid.length || busy} onClick={go}>{busy ? 'Import…' : `Importer ${valid.length}`}</button>
    </>}>
      <p className="modals-1">Utilise le même format que l'export Excel (colonnes Nom, Catégorie, Niveau, Format, Jours, CTT, Statut, Enseignement, Indoja - Nom…).</p>
      <input type="file" accept=".xlsx,.xls" onChange={pick} className="field-input modals-3" />
      {err && <p role="alert" className="modals-4">{err}</p>}
      {rows && (<>
        <label className="modals-5"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} className="fruitsview-13" /> Ignorer les doublons (même nom déjà dans la classe)</label>
        <div className="modals-6">
          {rows.map((r, i) => {
            const bad = r._errors.length > 0, dup = r._duplicate && skipDup;
            return (
              <div key={i} className="modals-7" style={{ color: bad ? T.danger : dup ? T.muted : T.text }}>
                <b className="app-12">{r.nom}</b><span>{catLabel(r.categorie) || '?'} {r.niveau}</span>
                <span>{bad ? r._errors.join(', ') : r._duplicate ? 'doublon' : 'OK'}</span>
              </div>
            );
          })}
        </div>
      </>)}
    </Sheet>
  );
}

/* ---------- Archives ---------- */
export function ArchivesModal({ store, classFruits, onClose }) {
  const archived = classFruits.filter((f) => f.archive);
  const [del, setDel] = useState(null);
  const [typed, setTyped] = useState('');
  const run = async (p, ok) => { try { await p; store.notify(ok); } catch (e) { store.notify(errorText(e), 'err'); } };
  return (
    <>
      <Sheet title={`Archives (${archived.length})`} onClose={onClose}>
        {!archived.length && <p className="dashboard-59">Aucun fruit archivé.</p>}
        {archived.map((f) => (
          <div key={f.id} className="modals-8">
            <div className="app-12"><b>{f.nom}</b><div className="dashboard-61">{catLabel(f.categorie)} {f.niveau}</div></div>
            <button className="btn-ghost" onClick={() => run(store.restore([f.id]), 'Fruit restauré')}>Restaurer</button>
            <button className="btn-danger" onClick={() => { setDel(f); setTyped(''); }}>Supprimer</button>
          </div>
        ))}
      </Sheet>
      {del && (
        <Sheet title="Suppression définitive" onClose={() => setDel(null)} footer={<>
          <button className="btn-ghost" onClick={() => setDel(null)}>Annuler</button>
          <button className="btn-primary modals-9" style={{ opacity: typed.trim().toLowerCase() === del.nom.trim().toLowerCase() ? 1 : .4 }}
            disabled={typed.trim().toLowerCase() !== del.nom.trim().toLowerCase()}
            onClick={async () => { const f = del; setDel(null); await run(store.remove([f.id]), 'Fruit supprimé'); }}>Supprimer pour toujours</button>
        </>}>
          <p>Cette action supprime <b>{del.nom}</b>, ses commentaires et son historique. Impossible d'annuler.</p>
          <Field label={`Tape « ${del.nom} » pour confirmer`}><input style={input} value={typed} onChange={(e) => setTyped(e.target.value)} /></Field>
        </Sheet>
      )}
    </>
  );
}

/* ---------- Objectifs d'une classe (final + par semaine) ---------- */
function GoalFields({ g, setG, cur }) {
  return (
    <div className="fruitform-5">
      {Object.keys(GOAL_LABELS).map((k) => (
        <Field key={k} label={cur ? `${GOAL_LABELS[k]} (actuel : ${cur[k]})` : GOAL_LABELS[k]}>
          <input style={input} type="number" min="0" inputMode="numeric" value={g[k]} onChange={(e) => setG({ ...g, [k]: e.target.value })} />
        </Field>
      ))}
    </div>
  );
}

function CopyFrom({ store, exceptId, onPick }) {
  const others = store.data.classes.filter((c) => c.id !== exceptId && Object.values(objectivesOf(store.data.objectifs, c.id)).some((v) => v > 0));
  const [from, setFrom] = useState('');
  if (!others.length) return null;
  return (
    <div className="modals-10">
      <select aria-label="Reprendre les objectifs de" className="field-input modals-11" value={from} onChange={(e) => setFrom(e.target.value)}>
        <option value="">Reprendre les objectifs de…</option>
        {others.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
      </select>
      <button className="btn-ghost" disabled={!from} onClick={() => onPick(objectivesOf(store.data.objectifs, from))}>Reprendre</button>
    </div>
  );
}

export function ObjectivesModal({ store, classId, onClose }) {
  const klass = store.data.classes.find((c) => c.id === classId);
  const [tab, setTab] = useState('final');
  const [g, setG] = useState(() => ({ ...objectivesOf(store.data.objectifs, classId) }));
  const weeks = useMemo(() => weekPoints(), []);
  const [w, setW] = useState(() => {
    const saved = weeklyGoalsOf(store.data.objectifs, classId);
    const o = {}; Object.keys(saved).forEach((k) => { o[k] = String(saved[k]); }); return o;
  });
  const cur = currentCounts(store.data.fruits.filter((f) => f.class_id === classId));
  const [busy, setBusy] = useState(false);
  const wk = (k, p) => `${k}@${p.key}`;

  function fillLinear() {
    const o = { ...w };
    SERIES_DEFS.forEach((d) => weeks.forEach((p, i) => { o[wk(d.key, p)] = String(linearTarget(g[d.key], i)); }));
    setW(o);
  }
  async function save() {
    setBusy(true);
    try {
      const values = {};
      Object.keys(GOAL_LABELS).forEach((k) => { values[k] = Number(g[k]) || 0; });
      Object.keys(w).forEach((k) => { if (w[k] !== '' && !isNaN(Number(w[k]))) values[k] = Number(w[k]); });
      await store.setObjectives(values, classId);
      store.notify('Objectifs enregistrés'); onClose();
    } catch (e) { store.notify(errorText(e), 'err'); } finally { setBusy(false); }
  }
  const tabBtn = (k, l) => (
    <button role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className="modals-12" style={{ background: tab === k ? '#fff' : 'transparent', fontWeight: tab === k ? 800 : 600, boxShadow: tab === k ? '0 1px 3px rgba(15,23,42,.15)' : 'none' }}>{l}</button>
  );

  return (
    <Sheet title={`Objectifs — ${klass ? klass.nom : ''}`} onClose={onClose} wide footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      {!store.readOnly && <button className="btn-primary" disabled={busy} onClick={save}>{busy ? 'Enregistrement…' : 'Enregistrer'}</button>}
    </>}>
      <div role="tablist" className="modals-13">
        {tabBtn('final', 'Objectif de la classe')}{tabBtn('weekly', 'Cibles par semaine')}
      </div>
      {tab === 'final' ? (<>
        <p className="modals-1">Ces objectifs ne concernent que cette classe. Ils apparaissent dans les barres au-dessus des fruits, dans le tableau de bord et dans le Form Telegram.</p>
        <CopyFrom store={store} exceptId={classId} onPick={(o) => setG({ ...o })} />
        <GoalFields g={g} setG={setG} cur={cur} />
      </>) : (<>
        <p className="modals-1">Nombre attendu à la fin de chaque semaine (cumulé). Une case vide suit la progression linéaire vers l'objectif de la classe : c'est la valeur grisée.</p>
        <button className="btn-ghost modals-14" onClick={fillLinear}>Remplir en progression linéaire</button>
        <div className="modals-15 no-scrollbar" >
          <table className="modals-16">
            <thead><tr><th className="modals-17"></th>
              {weeks.map((p) => <th key={p.key} className="modals-18">{p.label}</th>)}</tr></thead>
            <tbody>
              {SERIES_DEFS.map((d) => (
                <tr key={d.key}>
                  <th scope="row" className="modals-19"><span className="modals-20" style={{ background: d.color }} />{d.label}</th>
                  {weeks.map((p, i) => (
                    <td key={p.key} className="modals-21">
                      <input aria-label={`${d.label}, semaine du ${p.label}`} className="field-input modals-22" type="number" min="0" inputMode="numeric"
                        placeholder={String(linearTarget(g[d.key], i))} value={w[wk(d.key, p)] ?? ''} onChange={(e) => setW({ ...w, [wk(d.key, p)]: e.target.value })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>)}
    </Sheet>
  );
}

/* ---------- Actions groupées ---------- */
export function BulkModal({ ids, store, onClose, onDone }) {
  const [cat, setCat] = useState('');
  const [niv, setNiv] = useState('');
  const [fmt, setFmt] = useState('');
  const [arch, setArch] = useState(false);
  const levelOpts = cat === 'GBB' ? ['A', 'B'] : cat === 'IndivBB' ? ['A', 'B', 'C', 'D', 'E', 'TT'] : [];
  async function go() {
    try {
      const ch = {};
      if (cat) { ch.categorie = cat; ch.niveau = levelOpts.includes(niv) ? niv : levelOpts[0] || ''; }
      if (fmt) ch.format = fmt;
      if (Object.keys(ch).length) await store.bulkUpdate(ids, ch);
      if (arch) await store.archive(ids);
      store.notify(`${ids.length} fruit(s) modifié(s)`); onDone();
    } catch (e) { store.notify(errorText(e), 'err'); }
  }
  if (arch) return <Confirm title="Archiver la sélection ?" text={`${ids.length} fruit(s) seront archivés.`} confirmLabel="Archiver" onCancel={() => setArch(false)} onConfirm={go} />;
  return (
    <Sheet title={`${ids.length} fruit(s) sélectionné(s)`} onClose={onClose} footer={<>
      <button className="btn-danger" onClick={() => setArch(true)}>Archiver</button>
      <button className="btn-primary" onClick={go} disabled={!cat && !fmt}>Appliquer</button>
    </>}>
      <Field label="Changer de catégorie"><select style={input} value={cat} onChange={(e) => { setCat(e.target.value); setNiv(''); }}>
        <option value="">— inchangée —</option><option value="GBB">GBB</option><option value="IndivBB">Indiv BB</option><option value="NextClass">Next class</option><option value="Talak">Talak</option></select></Field>
      {levelOpts.length > 0 && <Field label="Niveau"><select style={input} value={niv || levelOpts[0]} onChange={(e) => setNiv(e.target.value)}>{levelOpts.map((o) => <option key={o}>{o}</option>)}</select></Field>}
      <Field label="Format"><select style={input} value={fmt} onChange={(e) => setFmt(e.target.value)}><option value="">— inchangé —</option><option>Online</option><option>Offline</option></select></Field>
    </Sheet>
  );
}

/* ---------- Nouvelle classe (avec ses objectifs) ---------- */
export function NewClassModal({ store, onClose }) {
  const [nom, setNom] = useState('Classe de ');
  const [g, setG] = useState({ ...DEFAULT_GOALS });
  const [debut, setDebut] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function go() {
    const n = nom.trim();
    if (!n || n === 'Classe de') return setErr('Indique le nom de la classe.');
    if (store.data.classes.some((c) => c.nom.trim().toLowerCase() === n.toLowerCase())) return setErr('Une classe porte déjà ce nom.');
    setBusy(true);
    try {
      const c = await store.saveClass({ nom: n, date_debut: debut || new Date().toISOString().slice(0, 10) });
      if (c && c.id) {
        const values = {}; Object.keys(GOAL_LABELS).forEach((k) => { values[k] = Number(g[k]) || 0; });
        if (Object.values(values).some((v) => v > 0)) await store.setObjectives(values, c.id);
        store.setClassId(c.id);
      }
      store.notify('Classe créée');
      onClose();
    } catch (e) { setErr(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Sheet title="Nouvelle classe" onClose={onClose} wide footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" disabled={busy} onClick={go}>{busy ? 'Création…' : 'Créer la classe'}</button>
    </>}>
      <Field label="Nom de la classe" error={err} hint="ex. Classe de Janv. 2027">
        <input style={input} value={nom} onChange={(e) => setNom(e.target.value)} autoFocus />
      </Field>
      <Field label="Début de la classe" hint="Sert à trier les classes de la plus récente à la plus ancienne.">
        <input style={input} type="date" value={debut} onChange={(e) => setDebut(e.target.value)} />
      </Field>
      <h3 className="modals-23">Objectifs de la classe</h3>
      <CopyFrom store={store} exceptId={null} onPick={(o) => setG({ ...o })} />
      <GoalFields g={g} setG={setG} />
      <p className="app-18">Tu pourras les modifier plus tard, et ajouter des cibles semaine par semaine.</p>
    </Sheet>
  );
}

/* ---------- Choix d'une classe (recherche, anciennes classes archivées) ---------- */
export function ClassPickerModal({ store, sorted, activeId, onPick, onMenu, onNew, onClose }) {
  const [q, setQ] = useState('');
  const [showOld, setShowOld] = useState(false);
  const match = (c) => c.nom.toLowerCase().includes(q.trim().toLowerCase());
  const live = sorted.filter((c) => !c.archivee && match(c));
  const old = sorted.filter((c) => c.archivee && match(c));
  const oldTotal = sorted.filter((c) => c.archivee).length;
  const count = (id) => store.data.fruits.filter((f) => f.class_id === id && !f.archive).length;
  const open = showOld || (q.trim() && old.length > 0);
  const row = (c) => (
    <div key={c.id} className="modals-24">
      <button onClick={() => onPick(c.id)} aria-current={c.id === activeId ? 'true' : undefined}
        className="modals-25" style={{ border: `1px solid ${c.id === activeId ? T.yellow : T.line}`, background: c.id === activeId ? T.pill : '#fff' }}>
        <span className="app-12" style={{ fontWeight: c.id === activeId ? 800 : 600 }}>{c.nom}</span>
        <span className="modals-26">{count(c.id)} fruit{count(c.id) > 1 ? 's' : ''}</span>
      </button>
      <button onClick={() => onMenu(c)} className="btn-ghost modals-27" aria-label={`Plus d'actions pour ${c.nom}`} aria-haspopup="dialog"><MoreHorizontal size={20} /></button>
    </div>
  );
  return (
    <Sheet title={`Classes (${sorted.length})`} onClose={onClose} footer={store.readOnly ? undefined : <button className="btn-primary" onClick={onNew}>+ Nouvelle classe</button>}>
      {sorted.length > 6 && <input className="field-input modals-28" placeholder="Rechercher une classe…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus aria-label="Rechercher une classe" />}
      {!live.length && !old.length && <p className="dashboard-59">Aucune classe ne correspond.</p>}
      {live.map(row)}
      {oldTotal > 0 && (
        <>
          <button onClick={() => setShowOld(!showOld)} aria-expanded={!!open} className="modals-29">
            <span className="modals-30" style={{ transform: open ? 'none' : 'rotate(-90deg)' }}>▾</span>Anciennes classes ({oldTotal})
          </button>
          {open && (old.length ? old.map(row) : <p className="dashboard-59">Aucune ancienne classe ne correspond.</p>)}
        </>
      )}
    </Sheet>
  );
}
