import { useState } from 'react';
import { Sheet, Field, input } from './ui';
import { CATEGORIES, T } from './theme';
import { levelOptionsFor, validateFruit } from './logic';
import { errorText } from './useStore';

const EMPTY = { nom: '', categorie: 'GBB', niveau: 'A', format: 'Online', jours: 0, statut: '', ctt: false, enseignement: '', indoja_nom: '', indoja_groupe: '', bbt_nom: '', bbt_tjn: '', a_relancer: false };

/** Création (fruit absent) ou mise à jour (fruit fourni). */
export default function FruitForm({ fruit, classId, fruits, store, onClose, onSaved }) {
  const editing = !!fruit;
  const [f, setF] = useState(fruit ? { ...fruit } : { ...EMPTY, class_id: classId });
  const [errs, setErrs] = useState({});
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  const setCat = (cat) => {
    const opts = levelOptionsFor(cat);
    setF((x) => ({ ...x, categorie: cat, niveau: opts.includes(x.niveau) ? x.niveau : opts[0] || '' }));
  };

  const dup = !editing && f.nom.trim() && fruits.some((x) => !x.archive && x.nom.trim().toLowerCase() === f.nom.trim().toLowerCase());

  async function save(over) {
    const payload = { ...f, ...(over || {}) };
    const e = validateFruit(payload);
    setErrs(e);
    if (Object.keys(e).length) return;
    setSaving(true);
    try {
      const r = await store.saveFruit({ ...payload, jours: Number(payload.jours) });
      store.notify(editing ? 'Fruit mis à jour' : 'Fruit ajouté');
      onSaved && onSaved(r);
      onClose();
    } catch (er) {
      if (er.code === 'CONFLIT') setConflict(er.current);
      else store.notify(errorText(er), 'err');
    } finally { setSaving(false); }
  }

  const opts = levelOptionsFor(f.categorie);

  if (conflict) {
    const keys = [['niveau', 'Niveau'], ['categorie', 'Catégorie'], ['jours', 'Jours'], ['statut', 'Statut'], ['enseignement', 'Enseignement']];
    return (
      <Sheet title="Modifié par quelqu'un d'autre" onClose={onClose} footer={<>
        <button className="btn-ghost" onClick={() => { store.reload(true); onClose(); }}>Garder la version de {conflict.updated_by || 'l\'autre'}</button>
        <button className="btn-primary" onClick={() => { const v = Number(conflict.version); setConflict(null); save({ version: v }); }}>Garder ma version</button>
      </>}>
        <p className="extras-35">{conflict.updated_by || 'Quelqu\'un'} a modifié ce fruit pendant que tu éditais.</p>
        <table className="fruitform-1">
          <thead><tr className="fruitform-2"><th></th><th>Ma version</th><th>Sa version</th></tr></thead>
          <tbody>{keys.map(([k, l]) => (
            <tr key={k} style={{ background: String(f[k] ?? '') !== String(conflict[k] ?? '') ? T.pill : 'transparent' }}>
              <td className="fruitform-3">{l}</td><td>{String(f[k] ?? '') || '—'}</td><td>{String(conflict[k] ?? '') || '—'}</td>
            </tr>))}</tbody>
        </table>
      </Sheet>
    );
  }

  return (
    <Sheet title={editing ? `Mettre à jour — ${fruit.nom}` : 'Nouveau fruit'} onClose={onClose} footer={<>
      <button className="btn-ghost" onClick={onClose}>Annuler</button>
      <button className="btn-primary" disabled={saving} onClick={() => save()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </>}>
      <Field label="Nom *" error={errs.nom}>
        <input style={input} value={f.nom} onChange={(e) => set('nom', e.target.value)} autoFocus={!editing} />
      </Field>
      {dup && <p className="fruitform-4">⚠️ Un fruit porte déjà ce nom dans cette classe. Tu peux quand même l'enregistrer.</p>}
      <div className="fruitform-5">
        <Field label="Catégorie">
          <select style={input} value={f.categorie} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Niveau" error={errs.niveau}>
          <select style={input} value={f.niveau || ''} disabled={!opts.length} onChange={(e) => set('niveau', e.target.value)}>
            {!opts.length && <option value="">—</option>}
            {opts.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Format">
          <select style={input} value={f.format} onChange={(e) => set('format', e.target.value)}>
            <option>Online</option><option>Offline</option>
          </select>
        </Field>
        <Field label="Jours cumulés" error={errs.jours}>
          <input style={input} type="number" min="0" inputMode="numeric" value={f.jours} onChange={(e) => set('jours', e.target.value)} />
        </Field>
      </div>
      <div className="fruitform-6">
        <label className="fruitform-7">
          <input type="checkbox" checked={!!f.ctt} onChange={(e) => set('ctt', e.target.checked)} className="extras-22" /> ⭐ CTT
        </label>
        <label className="fruitform-8">
          <input type="checkbox" checked={!!f.a_relancer} onChange={(e) => set('a_relancer', e.target.checked)} className="extras-22" /> À relancer
        </label>
      </div>
      <Field label="Enseignement (dernier cours)"><input style={input} value={f.enseignement || ''} onChange={(e) => set('enseignement', e.target.value)} /></Field>
      <Field label="Statut / dernière nouvelle"><textarea className="field-input fruitform-9" value={f.statut || ''} onChange={(e) => set('statut', e.target.value)} /></Field>
      <div className="fruitform-5">
        <Field label="Indoja — nom"><input style={input} value={f.indoja_nom || ''} onChange={(e) => set('indoja_nom', e.target.value)} /></Field>
        <Field label="Indoja — groupe"><input style={input} value={f.indoja_groupe || ''} onChange={(e) => set('indoja_groupe', e.target.value)} /></Field>
        <Field label="BBT — nom"><input style={input} value={f.bbt_nom || ''} onChange={(e) => set('bbt_nom', e.target.value)} /></Field>
        <Field label="BBT — TJN"><input style={input} value={f.bbt_tjn || ''} onChange={(e) => set('bbt_tjn', e.target.value)} /></Field>
      </div>
    </Sheet>
  );
}
