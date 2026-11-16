import { useCallback, useEffect, useRef, useState } from 'react';
import { callApi, ApiError } from './api';
import { normalizeFruit } from './logic';

const EMPTY = { classes: [], fruits: [], commentaires: [], historique: [], objectifs: [], exports: [] };
const toBool = (v) => v === true || v === 'TRUE' || v === 'true';

function normalize(data) {
  return {
    ...EMPTY, ...data,
    classes: (data.classes || []).map((c) => ({ ...c, archivee: toBool(c.archivee) })),
    fruits: (data.fruits || []).map(normalizeFruit),
  };
}

const MESSAGES = {
  RESEAU: 'Connexion impossible. Vérifie ta connexion internet.',
  OCCUPE: "Quelqu'un d'autre enregistre en ce moment, réessaie dans un instant.",
  CODE_INVALIDE: "Code d'équipe incorrect.",
  LECTURE_SEULE: 'Ton accès est en lecture seule : modification impossible.',
  ADMIN_REQUIS: 'Réservé aux administrateurs.',
};
export const errorText = (e) => MESSAGES[e && e.code] || (e && e.message) || 'Erreur inconnue';

export function useStore(creds, onAuthError) {
  const [data, setData] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [classId, setClassId] = useState(null);
  const [toast, setToast] = useState(null);
  const [role, setRole] = useState('equipe');
  const counter = useRef(null);
  const busy = useRef(0);
  const dataRef = useRef(data);
  dataRef.current = data;

  /** undo = { label?, fn } : affiche un bouton « Annuler » (6 s au lieu de 3,5 s) */
  const notify = useCallback((msg, kind = 'ok', undo) => {
    const ms = undo ? 6000 : 3500;
    setToast({ msg, kind, undo, id: Date.now() });
    setTimeout(() => setToast((t) => (t && Date.now() - t.id >= ms - 100 ? null : t)), ms);
  }, []);
  const dismissToast = useCallback(() => setToast(null), []);

  const reload = useCallback(async (silent) => {
    try {
      const r = await callApi(creds, 'load');
      counter.current = r.counter;
      if (r.role) setRole(r.role);
      const d = normalize(r.data);
      setData(d);
      setClassId((cur) => (cur && d.classes.some((c) => c.id === cur) ? cur : (d.classes.filter((c) => !c.archivee)[0] || d.classes[0] || {}).id || null));
    } catch (e) {
      if (e.code === 'CODE_INVALIDE') onAuthError && onAuthError();
      else if (!silent) notify(errorText(e), 'err');
    } finally { setLoading(false); }
  }, [creds, notify, onAuthError]);

  useEffect(() => { reload(); }, [reload]);

  // Sondage du compteur global toutes les 20 s
  useEffect(() => {
    const id = setInterval(async () => {
      if (busy.current || document.hidden) return;
      try {
        const r = await callApi(creds, 'counter');
        if (counter.current !== null && r.counter !== counter.current) reload(true);
      } catch { /* silencieux */ }
    }, 20000);
    return () => clearInterval(id);
  }, [creds, reload]);

  /** Écriture avec mise à jour immédiate ; annule si l'API échoue */
  const write = useCallback(async (action, payload, optimistic) => {
    const before = dataRef.current;
    if (optimistic) setData((d) => optimistic(d));
    busy.current += 1;
    try {
      const r = await callApi(creds, action, payload);
      counter.current = r.counter;
      await reload(true); // récupère versions, historique et ids générés côté serveur
      return r.result;
    } catch (e) {
      setData(before);
      if (e.code === 'CODE_INVALIDE') onAuthError && onAuthError();
      throw e;
    } finally { busy.current -= 1; }
  }, [creds, reload, onAuthError]);

  const patchFruits = (ids, ch) => (d) => ({ ...d, fruits: d.fruits.map((f) => (ids.includes(f.id) ? { ...f, ...ch } : f)) });

  return {
    data, loading, classId, setClassId, toast, notify, dismissToast, reload,
    role, readOnly: role === 'lecture', isAdmin: role === 'admin',
    saveFruit: (f) => write('saveFruit', f, f.id ? patchFruits([f.id], f) : null),
    bulkUpdate: (ids, changes) => write('bulkUpdate', { ids, changes }, patchFruits(ids, changes)),
    archive: (ids) => write('archiveFruits', { ids }, patchFruits(ids, { archive: true })),
    restore: (ids) => write('restoreFruits', { ids }, patchFruits(ids, { archive: false })),
    remove: (ids) => write('deleteFruits', { ids }, (d) => ({ ...d, fruits: d.fruits.filter((f) => !ids.includes(f.id)) })),
    importRows: (rows) => write('importFruits', { class_id: classId, rows }),
    addComment: (fruit_id, texte) => write('addComment', { fruit_id, texte }),
    editComment: (id, texte) => write('editComment', { id, texte }, (d) => ({ ...d, commentaires: d.commentaires.map((c) => (c.id === id ? { ...c, texte } : c)) })),
    deleteComment: (id) => write('deleteComment', { id }, (d) => ({ ...d, commentaires: d.commentaires.filter((c) => c.id !== id) })),
    saveClass: (c) => write('saveClass', c),
    archiveClass: (id, flag) => write('saveClass', { id, archivee: flag }, (d) => ({ ...d, classes: d.classes.map((c) => (c.id === id ? { ...c, archivee: flag } : c)) })),
    setObjectives: (values, cid) => write('setObjectives', { class_id: cid || classId, values }),
    renameClass: (id, nom) => write('saveClass', { id, nom }, (d) => ({ ...d, classes: d.classes.map((c) => (c.id === id ? { ...c, nom } : c)) })),
    transferFruits: (ids, to_class_id, mode, withComments, changes) => write('transferFruits', { ids, to_class_id, mode, withComments, changes }),
    getReaders: async () => (await callApi(creds, 'getReaders')).result || [],
    setReaders: (names) => write('setReaders', { names }),
    confirmExport: (snapshot) => write('confirmExport', { class_id: classId, snapshot }),
  };
}

export { ApiError };
