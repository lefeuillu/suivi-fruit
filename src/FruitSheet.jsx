import { useState } from 'react';
import { Pencil, Trash2, Archive, Send } from 'lucide-react';
import { Sheet, LevelCell, CttBadge, input, fmtDate, Confirm } from './ui';
import { catLabel } from './theme';
import { needsFollowUp } from './logic';
import { errorText } from './useStore';

export default function FruitSheet({ fruit, store, user, onClose, onEdit }) {
  const { commentaires, historique } = store.data;
  const comments = commentaires.filter((c) => c.fruit_id === fruit.id).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const hist = historique.filter((h) => h.fruit_id === fruit.id).sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 8);
  const [txt, setTxt] = useState('');
  const [editId, setEditId] = useState(null);
  const [editTxt, setEditTxt] = useState('');
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  const ro = store.readOnly;
  const run = async (p, ok) => { try { await p; ok && store.notify(ok); } catch (e) { store.notify(errorText(e), 'err'); } };

  async function add() {
    if (!txt.trim()) return;
    const t = txt; setTxt('');
    await run(store.addComment(fruit.id, t));
  }

  const row = (l, v) => v ? (<div className="fruitsheet-1"><span className="dashboard-59">{l}</span><span className="fruitsheet-2">{v}</span></div>) : null;

  return (
    <>
      <Sheet title={fruit.nom} onClose={onClose} wide footer={ro ? <button className="btn-ghost" onClick={onClose}>Fermer</button> : <>
        <button className="btn-danger" onClick={() => setConfirmArchive(true)}><Archive size={16} className="app-2" /> Archiver</button>
        <button className="btn-primary" onClick={() => onEdit(fruit)}><Pencil size={16} className="app-2" /> Mettre à jour</button>
      </>}>
        <div className="fruitsheet-3">
          <LevelCell fruit={fruit} />
          <div>
            <div className="dashboard-63">{catLabel(fruit.categorie)} · {fruit.format}</div>
            <div className="app-18">{fruit.jours} jours cumulés</div>
            <div className="fruitsheet-4">
              {fruit.ctt && <CttBadge />}
              {needsFollowUp(fruit) && <span className="fruitsheet-5">À relancer</span>}
            </div>
          </div>
        </div>
        {row('Statut', fruit.statut)}
        {row('Enseignement', fruit.enseignement)}
        {row('Indoja', [fruit.indoja_nom, fruit.indoja_groupe].filter(Boolean).join(' · '))}
        {row('BBT', [fruit.bbt_nom, fruit.bbt_tjn].filter(Boolean).join(' · '))}
        {row('Dernière mise à jour', fruit.updated_at ? `${fmtDate(fruit.updated_at)} par ${fruit.updated_by || '?'}` : '')}

        <h3 className="fruitsheet-6">Commentaires ({comments.length})</h3>
        {!ro && <div className="extras-28">
          <input style={input} placeholder="Ajouter un commentaire…" value={txt} onChange={(e) => setTxt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          <button className="btn-primary fruitsheet-7" onClick={add} aria-label="Envoyer"><Send size={18} /></button>
        </div>}
        {comments.map((c) => (
          <div key={c.id} className="fruitsheet-8">
            <div className="fruitsheet-9">
              <span><b>{c.auteur}</b> · {fmtDate(c.date)}</span>
              {!ro && c.auteur === user && editId !== c.id && (
                <span>
                  <button aria-label="Modifier" onClick={() => { setEditId(c.id); setEditTxt(c.texte); }} className="fruitsheet-10"><Pencil size={14} /></button>
                  <button aria-label="Supprimer" onClick={() => setConfirmDel(c)} className="fruitsheet-10"><Trash2 size={14} /></button>
                </span>
              )}
            </div>
            {editId === c.id ? (
              <div className="fruitsheet-11">
                <input style={input} value={editTxt} onChange={(e) => setEditTxt(e.target.value)} />
                <button className="btn-primary" onClick={async () => { await run(store.editComment(c.id, editTxt)); setEditId(null); }}>OK</button>
              </div>
            ) : <div className="fruitsheet-12">{c.texte}</div>}
          </div>
        ))}

        {hist.length > 0 && (<>
          <h3 className="fruitsheet-6">Historique</h3>
          {hist.map((h) => (
            <div key={h.id} className="fruitsheet-13">
              {fmtDate(h.date)} · {h.auteur} · {h.champ}{['niveau', 'categorie', 'ctt'].includes(h.champ) ? ` : ${h.ancien || '—'} → ${h.nouveau || '—'}` : ''}
            </div>
          ))}
        </>)}
      </Sheet>
      {confirmArchive && <Confirm title="Archiver ce fruit ?" text={`${fruit.nom} sera retiré des listes et de l'export Telegram. Tu pourras le restaurer depuis les archives.`} confirmLabel="Archiver"
        onCancel={() => setConfirmArchive(false)} onConfirm={async () => {
          setConfirmArchive(false);
          try {
            await store.archive([fruit.id]);
            store.notify('Fruit archivé', 'ok', { fn: async () => { try { await store.restore([fruit.id]); store.notify('Archivage annulé'); } catch (e) { store.notify(errorText(e), 'err'); } } });
          } catch (e) { store.notify(errorText(e), 'err'); }
          onClose();
        }} />}
      {confirmDel && <Confirm title="Supprimer ce commentaire ?" text="Cette action est définitive." danger confirmLabel="Supprimer"
        onCancel={() => setConfirmDel(null)} onConfirm={async () => { const c = confirmDel; setConfirmDel(null); await run(store.deleteComment(c.id)); }} />}
    </>
  );
}
