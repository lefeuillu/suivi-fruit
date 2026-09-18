import { useState, useEffect, useRef } from "react";
import {
  Search, Plus, Download, ChevronLeft, X, Trash2, Check, Grape,
  LayoutGrid, Users, User, PauseCircle, ArrowRightCircle, RefreshCw,
  MessageSquarePlus, Send, Sparkles, LogOut,
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase, TEAM_EMAIL } from "../lib/supabaseClient";

const CATEGORIES = [
  { id: "GBB", label: "GBB", short: "GBB", color: "#B8860B", bg: "#FBF1DA", icon: Users },
  { id: "IndivBB", label: "Indiv BB", short: "Indiv", color: "#4B6B45", bg: "#EAF1E6", icon: User },
  { id: "Talak", label: "Talak", short: "Talak", color: "#A5432E", bg: "#F7E7E1", icon: PauseCircle },
  { id: "NextClass", label: "Next class", short: "Next", color: "#3A5A6B", bg: "#E5EEF1", icon: ArrowRightCircle },
];
const catInfo = (id) => CATEGORIES.find((c) => c.id === id) || CATEGORIES[0];
const MONTHS_FR = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];
const DEFAULT_GOALS = { ctt: "0", bbGroup: "3", ab: "5", c: "0", de: "0", tt: "0" };

const levelOptionsFor = (categorie) => {
  if (categorie === "GBB") return ["A (GBB)", "B (GBB)"];
  if (categorie === "IndivBB") return ["A", "B", "C", "D", "E", "TT"];
  return [];
};
const levelLetter = (niveau) => {
  if (!niveau) return null;
  if (/tt|ttagui/i.test(niveau)) return "TT";
  const ch = niveau.trim()[0];
  return /[A-Ea-e]/.test(ch) ? ch.toUpperCase() : null;
};
const memberLine = (p) => `${p.nom}(${p.indojaNom || ""}/${p.bbtNom || ""})`;

// --- conversion base de données (snake_case) <-> app (camelCase) ---
const fromDb = (r) => ({
  id: r.id,
  nom: r.nom || "",
  categorie: r.categorie,
  niveau: r.niveau || "",
  mode: r.mode || "Offline",
  jo: r.jo || "1",
  indojaNom: r.indoja_nom || "",
  indojaGroupe: r.indoja_groupe || "",
  bbtNom: r.bbt_nom || "",
  bbtTjn: r.bbt_tjn || "",
  statutCourt: r.statut_court || "",
  sessionsHebdo: r.sessions_hebdo || "",
  sessionsCumule: r.sessions_cumule || "",
  dernierCours: r.dernier_cours || "",
  dateTalak: r.date_talak || "",
  ctt: r.ctt || false,
  journal: r.journal || [],
  lastExportNiveau: r.last_export_niveau || null,
});
const toDb = (p) => ({
  nom: p.nom,
  categorie: p.categorie,
  niveau: p.niveau,
  mode: p.mode,
  jo: p.jo,
  indoja_nom: p.indojaNom,
  indoja_groupe: p.indojaGroupe,
  bbt_nom: p.bbtNom,
  bbt_tjn: p.bbtTjn,
  statut_court: p.statutCourt,
  sessions_hebdo: p.sessionsHebdo,
  sessions_cumule: p.sessionsCumule,
  dernier_cours: p.dernierCours,
  date_talak: p.dateTalak || null,
  ctt: !!p.ctt,
  journal: p.journal || [],
});

const emptyDraft = () => ({
  nom: "", categorie: "GBB", niveau: "", mode: "Offline", jo: "1",
  indojaNom: "", indojaGroupe: "", bbtNom: "", bbtTjn: "", statutCourt: "",
  sessionsHebdo: "", sessionsCumule: "", dernierCours: "", dateTalak: "", ctt: false,
});

// ===================== ECRAN DE CONNEXION (mot de passe unique) =====================
function LoginGate({ onLoggedIn, authError = "" }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: TEAM_EMAIL,
      password,
    });
    setLoading(false);
    if (error) {
      setError("Mot de passe incorrect.");
      return;
    }
    onLoggedIn();
  }

  return (
    <div style={{
      width: "100%", height: 640, maxWidth: 420, margin: "0 auto", borderRadius: 20,
      background: "#F5F2EA", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: 24,
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14, background: "#3D2645",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <Grape size={28} color="#E8C9F0" />
      </div>
      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, color: "#2B1F30", margin: "0 0 4px" }}>
        Suivi des fruits
      </h1>
      <p style={{ fontSize: 13, color: "#8A7F72", margin: "0 0 24px" }}>Accès réservé à l'équipe</p>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: 280 }}>
        <input
          type="password"
          autoFocus
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%", padding: "12px 14px", borderRadius: 12,
            border: "1px solid #DDD8CE", fontSize: 15, marginBottom: 10,
            boxSizing: "border-box", background: "#FFFDF9",
          }}
        />
        {authError && <div style={{ color: "#A5432E", fontSize: 13, marginBottom: 10 }}>{authError}</div>}
        {error && <div style={{ color: "#A5432E", fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
            background: "#3D2645", color: "#F5F2EA", fontSize: 15, fontWeight: 500,
            cursor: "pointer", opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? "Connexion..." : "Entrer"}
        </button>
      </form>
    </div>
  );
}

// ===================== APP PRINCIPALE =====================
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = pas encore vérifié
  const [authReady, setAuthReady] = useState(false);
  const [sessionError, setSessionError] = useState("");
  const [people, setPeople] = useState([]);
  const [dataError, setDataError] = useState("");
  const [view, setView] = useState("list");
  const [tab, setTab] = useState("Tous");
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [modalMode, setModalMode] = useState("view");
  const [draft, setDraft] = useState(emptyDraft());
  const [editDraft, setEditDraft] = useState(null);
  const [journalText, setJournalText] = useState("");
  const [toast, setToast] = useState("");
  const [goals, setGoals] = useState(DEFAULT_GOALS);
  const [goalsDraft, setGoalsDraft] = useState(DEFAULT_GOALS);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const searchInputRef = useRef(null);

  // --- session ---
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) {
          console.error("Impossible de vérifier la session Supabase.", error);
          setSessionError("La connexion au service d'authentification a échoué.");
        }
        setSession(data.session);
        setAuthReady(true);
      })
      .catch((error) => {
        console.error("Impossible de vérifier la session Supabase.", error);
        setSessionError("La connexion au service d'authentification a échoué.");
        setSession(null);
        setAuthReady(true);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event !== "INITIAL_SESSION") setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // --- chargement initial + realtime (les changements des autres arrivent en direct) ---
  useEffect(() => {
    if (!session) return;
    let channel;
    (async () => {
      const { data: fruitsData, error: fruitsError } = await supabase
        .from("fruits").select("*").order("created_at", { ascending: false });
      if (fruitsError) throw fruitsError;
      if (fruitsData) setPeople(fruitsData.map(fromDb));
      const { data: settingsData, error: settingsError } = await supabase
        .from("settings").select("goals").eq("id", 1).single();
      if (settingsError && settingsError.code !== "PGRST116") throw settingsError;
      if (settingsData?.goals) setGoals(settingsData.goals);
      setDataError("");

      channel = supabase
        .channel("fruits-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "fruits" }, async () => {
          const { data, error } = await supabase.from("fruits").select("*").order("created_at", { ascending: false });
          if (error) {
            console.error("Impossible de rafraîchir les fruits.", error);
            setDataError("Les données n'ont pas pu être actualisées.");
            return;
          }
          if (data) setPeople(data.map(fromDb));
        })
        .subscribe();
    })().catch((error) => {
      console.error("Impossible de charger les données.", error);
      setDataError("Les données n'ont pas pu être chargées. Vérifiez la configuration Supabase.");
    });
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [session]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2200); };
  const toggleSearch = () => { setSearchOpen((v) => !v); if (searchOpen) setQuery(""); };

  const selected = people.find((p) => p.id === selectedId);
  const filtered = people.filter((p) => {
    const matchesTab = tab === "Tous" || p.categorie === tab;
    const q = query.trim().toLowerCase();
    const matchesQuery = !q || (p.nom || "").toLowerCase().includes(q) ||
      (p.indojaNom || "").toLowerCase().includes(q) || (p.bbtNom || "").toLowerCase().includes(q);
    return matchesTab && matchesQuery;
  });
  const counts = CATEGORIES.reduce((acc, c) => { acc[c.id] = people.filter((p) => p.categorie === c.id).length; return acc; }, {});
  const learningCount = (counts.GBB || 0) + (counts.IndivBB || 0);

  function openForm() { setDraft(emptyDraft()); setView("form"); }

  async function saveDraft() {
    if (!draft.nom.trim()) { showToast("Le nom du fruit est obligatoire"); return; }
    const { error } = await supabase.from("fruits").insert(toDb(draft));
    if (error) { showToast("Erreur : " + error.message); return; }
    setView("list");
    showToast("Fruit ajouté");
  }

  function openDetail(id) { setSelectedId(id); setModalMode("view"); setJournalText(""); }
  function closeDetail() { setSelectedId(null); setEditDraft(null); setModalMode("view"); }
  function startEditInfo() { setEditDraft({ ...selected }); setModalMode("editInfo"); }

  async function saveEditInfo() {
    if (!editDraft || !selectedId) {
      showToast("Impossible d'identifier le fruit à modifier");
      return;
    }
    if (!editDraft.nom.trim()) {
      showToast("Le nom du fruit est obligatoire");
      return;
    }
    const { error } = await supabase
      .from("fruits")
      .update(toDb(editDraft))
      .eq("id", selectedId);
    if (error) {
      console.error("Impossible de mettre à jour le fruit.", error);
      showToast("Erreur lors de la mise à jour : " + error.message);
      return;
    }
    setPeople((currentPeople) => currentPeople.map((person) => (
      person.id === selectedId ? { ...person, ...editDraft } : person
    )));
    closeDetail();
    showToast("Infos mises à jour");
  }

  async function deleteSelected() {
    const { error } = await supabase.from("fruits").delete().eq("id", selectedId);
    if (error) { showToast("Erreur : " + error.message); return; }
    closeDetail();
    showToast("Fruit supprimé");
  }

  async function validateComment() {
    if (!journalText.trim() || !selected) return;
    const entry = { date: new Date().toLocaleDateString("fr-FR"), texte: journalText.trim() };
    const newJournal = [entry, ...(selected.journal || [])];
    const { error } = await supabase.from("fruits").update({ journal: newJournal }).eq("id", selectedId);
    if (error) { showToast("Erreur : " + error.message); return; }
    setJournalText("");
    setModalMode("view");
    showToast("Commentaire ajouté");
  }

  function openGoals() { setGoalsDraft(goals); setGoalsOpen(true); }

  async function saveGoals() {
    await supabase.from("settings").update({ goals: goalsDraft }).eq("id", 1);
    setGoals(goalsDraft);
    setGoalsOpen(false);
    await exportTelegram(goalsDraft);
  }

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    CATEGORIES.forEach((cat) => {
      const rows = people.filter((p) => p.categorie === cat.id).map((p) => ({
        Nom: p.nom, Niveau: p.niveau, Mode: `${p.mode} JO ${p.jo}`,
        "Indoja - Nom": p.indojaNom, "Indoja - Groupe/Région": p.indojaGroupe,
        "BBT - Nom": p.bbtNom, "BBT - TJN": p.bbtTjn, Statut: p.statutCourt,
        "Sessions hebdo": p.sessionsHebdo, "Sessions cumulé": p.sessionsCumule,
        "Dernier cours": p.dernierCours,
        ...(cat.id === "Talak" ? { "Date de Talak": p.dateTalak } : {}),
        Mémo: (p.journal || []).map((j) => `${j.date}: ${j.texte}`).join(" | "),
      }));
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Nom: "" }]);
      XLSX.utils.book_append_sheet(wb, ws, cat.label.slice(0, 31));
    });
    XLSX.writeFile(wb, `suivi-fruits-${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast("Export Excel généré");
  }

  function buildTelegramText(goalsValue) {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    const code = "43" + pad2(now.getMonth() + 1) + pad2(now.getDate());
    const monthLabel = MONTHS_FR[now.getMonth()];
    const gbbPeople = people.filter((p) => p.categorie === "GBB");
    const indivPeople = people.filter((p) => p.categorie === "IndivBB");
    const nextPeople = people.filter((p) => p.categorie === "NextClass");
    const talakPeople = people.filter((p) => p.categorie === "Talak");

    const lines = [];
    lines.push(`🗼${code}_ ${monthLabel} Class`, "");
    lines.push(`🔶ESF- ONLINE (${gbbPeople.length + indivPeople.length})`, "");
    lines.push("📌Goal :");
    lines.push(`❗️CTT : ${goalsValue.ctt}`);
    lines.push(`❗️BB group : ${goalsValue.bbGroup}`);
    lines.push(`▫️A,B : ${goalsValue.ab}`);
    lines.push(`▫️C : ${goalsValue.c}`);
    lines.push(`▫️D, E : ${goalsValue.de}`);
    lines.push(`▫️TT : ${goalsValue.tt}`, "");

    lines.push(`🔹BB Group (${gbbPeople.length})`, "");
    const gbbLetters = ["A", "B"];
    const extraGbb = [...new Set(gbbPeople.map((p) => levelLetter(p.niveau)).filter((l) => l && !gbbLetters.includes(l)))];
    [...gbbLetters, ...extraGbb].forEach((l) => {
      const members = gbbPeople.filter((p) => levelLetter(p.niveau) === l);
      lines.push(`🔆Level ${l} (${members.length})`);
      members.forEach((p) => lines.push(memberLine(p)));
      lines.push("");
    });

    lines.push(`🔹Individual Educations (${indivPeople.length})`, "");
    ["A", "B", "C", "D", "E"].forEach((l) => {
      const members = indivPeople.filter((p) => levelLetter(p.niveau) === l);
      lines.push(`🔆Level ${l} (${members.length})`);
      members.forEach((p) => lines.push(memberLine(p)));
      lines.push("");
    });
    const ttMembers = indivPeople.filter((p) => levelLetter(p.niveau) === "TT");
    lines.push(`🔆Ttagui (${ttMembers.length})`);
    ttMembers.forEach((p) => lines.push(memberLine(p)));
    lines.push("");
    lines.push(`🔆Level Next (${nextPeople.length})`);
    nextPeople.forEach((p) => lines.push(memberLine(p)));
    lines.push("");
    lines.push(`❌ Talak (${talakPeople.length})`);
    talakPeople.forEach((p) => lines.push(memberLine(p)));
    lines.push("");
    lines.push(`↪️Change ()`);
    people.forEach((p) => {
      if (p.lastExportNiveau !== null && p.lastExportNiveau !== p.niveau) {
        lines.push(`${p.nom}(${p.indojaNom || ""}/${p.bbtNom || ""}) (${p.lastExportNiveau || "—"}) >> (${p.niveau || "—"})`);
      }
    });
    return lines.join("\n");
  }

  async function exportTelegram(goalsValue) {
    const text = buildTelegramText(goalsValue);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-telegram-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    // on mémorise le niveau actuel de chacun pour détecter les prochains changements
    await Promise.all(people.map((p) => supabase.from("fruits").update({ last_export_niveau: p.niveau }).eq("id", p.id)));
    showToast("Export Telegram généré");
  }

  if (!authReady || session === undefined) {
    return (
      <div style={{
        height: 640, maxWidth: 420, margin: "0 auto", borderRadius: 20,
        background: "#F5F2EA", display: "flex", alignItems: "center",
        justifyContent: "center", color: "#8A7F72",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>
        Vérification de la connexion...
      </div>
    );
  }
  if (!session) return <LoginGate onLoggedIn={() => {}} authError={sessionError} />;

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #DDD8CE",
    fontSize: 15, marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit", background: "#FFFDF9",
  };
  const labelStyle = { fontSize: 12, color: "#7A6F63", marginBottom: 4, display: "block", fontWeight: 500 };

  // --- le reste du rendu (liste, formulaire, bulle de détail) reprend exactement
  //     celui de la version prototype déjà validée : colle ici le JSX du composant
  //     App() que tu as dans l'artefact "suivi-fruits-app.jsx", à partir du
  //     `return (` jusqu'à la fin — seule la logique de données change, pas l'affichage. --

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#F5F2EA",
        width: "100%",
        height: 640,
        maxWidth: 420,
        margin: "0 auto",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        .no-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; width: 0; height: 0; }
        @keyframes cttShine {
          0% { background-position: -120% 0; }
          100% { background-position: 220% 0; }
        }
        .ctt-shine {
          background-image: linear-gradient(110deg, #D4AF37 30%, #FBEFC0 45%, #D4AF37 60%);
          background-size: 250% 100%;
          animation: cttShine 2.4s ease-in-out infinite;
        }
        @keyframes searchExpand {
          from { opacity: 0; transform: scaleX(0.85); }
          to { opacity: 1; transform: scaleX(1); }
        }
      `}</style>
      {toast && (
        <div
          style={{
            position: "absolute",
            top: 10,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#2B1F30",
            color: "#F5F2EA",
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 13,
            zIndex: 60,
          }}
        >
          {toast}
        </div>
      )}
      {dataError && (
        <div style={{
          position: "absolute", top: 10, left: 10, right: 10, zIndex: 55,
          padding: "10px 14px", borderRadius: 12, background: "#F7E7E1",
          color: "#A5432E", fontSize: 13, textAlign: "center",
        }}>
          {dataError}
        </div>
      )}

      {view === "list" && (
        <div style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 10,
              padding: "18px 18px 30px",
              background:
                "linear-gradient(to bottom, rgba(245,242,234,0.98) 0%, rgba(245,242,234,0.98) 80%, rgba(245,242,234,0) 100%)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "#3D2645",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Grape size={20} color="#E8C9F0" />
              </div>

              {!searchOpen && (
                <div style={{ flex: 1, minWidth: 0, transition: "opacity 0.2s ease" }}>
                  <h1
                    style={{
                      fontFamily: "Georgia, 'Iowan Old Style', serif",
                      fontSize: 20,
                      margin: "0 0 1px",
                      color: "#2B1F30",
                    }}
                  >
                    Suivi des fruits
                  </h1>
                  <p style={{ fontSize: 12, color: "#8A7F72", margin: "1px 0 0" }}>
                    {learningCount} fruit{learningCount > 1 ? "s" : ""} qui apprennent
                  </p>
                </div>
              )}

              {searchOpen && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: "flex",
                    alignItems: "center",
                    animation: "searchExpand 0.22s ease",
                    transformOrigin: "right center",
                  }}
                >
                  <input
                    ref={searchInputRef}
                    placeholder="Rechercher un fruit ou binôme..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 20,
                      border: "1px solid #DDD8CE",
                      fontSize: 14,
                      boxSizing: "border-box",
                      fontFamily: "inherit",
                      background: "#FFFDF9",
                    }}
                  />
                </div>
              )}

              <button
                onClick={toggleSearch}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background: searchOpen ? "#3D2645" : "#FFFDF9",
                  boxShadow: searchOpen ? "none" : "0 0 0 1px #DDD8CE inset",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                {searchOpen ? <X size={17} color="#F5F2EA" /> : <Search size={17} color="#2B1F30" />}
              </button>
              <button
                onClick={() => supabase.auth.signOut()}
                title="Se déconnecter"
                style={{
                  width: 34, height: 34, borderRadius: "50%", border: "1px solid #DDD8CE",
                  background: "#FFFDF9", display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, cursor: "pointer",
                }}
              >
                <LogOut size={14} color="#8A7F72" />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                onClick={openForm}
                style={{
                  width: 42,
                  height: 42,
                  flexShrink: 0,
                  borderRadius: "50%",
                  border: "none",
                  background: "#3D2645",
                  color: "#F5F2EA",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
              >
                <Plus size={19} />
              </button>
              <button
                onClick={exportExcel}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "0 14px",
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid #DDD8CE",
                  background: "#FFFDF9",
                  color: "#2B1F30",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Download size={15} /> Excel
              </button>
              <button
                onClick={openGoals}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 7,
                  padding: "0 14px",
                  height: 42,
                  borderRadius: 999,
                  border: "1px solid #DDD8CE",
                  background: "#FFFDF9",
                  color: "#2B1F30",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                <Send size={15} /> Form Telegram
              </button>
            </div>
          </div>

          {searchOpen && (
            <div
              onClick={toggleSearch}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "transparent",
                zIndex: 8,
              }}
            />
          )}

          <div
            className="no-scrollbar"
            style={{
              position: "absolute",
              inset: 0,
              overflowY: "auto",
              padding: "158px 18px 76px",
              zIndex: 1,
            }}
          >
            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 20px", color: "#A79C8E", fontSize: 14 }}>
                {people.length === 0
                  ? "Aucun fruit enregistré pour l'instant."
                  : "Aucun résultat pour cette recherche."}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map((p) => {
                const info = catInfo(p.categorie);
                return (
                  <div
                    key={p.id}
                    onClick={() => openDetail(p.id)}
                    style={{
                      background: "#FFFDF9",
                      border: p.ctt ? "1.5px solid #D4AF37" : "1px solid #EAE5D9",
                      boxShadow: p.ctt ? "0 0 0 1px #F0D98C, 0 0 8px rgba(212,175,55,0.55)" : "none",
                      borderRadius: 14,
                      padding: "14px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                      gap: 10,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 500, color: "#2B1F30", marginBottom: 3 }}>
                        {p.nom}
                      </div>
                      <div style={{ fontSize: 12, color: "#8A7F72", marginBottom: 3 }}>
                        {p.indojaNom || "—"}
                        {p.bbtNom ? ` / ${p.bbtNom}` : ""} · JO {p.jo} ({p.mode})
                      </div>
                      {p.statutCourt && (
                        <div
                          style={{
                            fontSize: 12,
                            color: "#5C5347",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {p.statutCourt}
                        </div>
                      )}
                    </div>
                    <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        {p.ctt && (
                          <div
                            className="ctt-shine"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 3,
                              padding: "5px 8px",
                              borderRadius: 8,
                              color: "#2B1F30",
                              fontSize: 11,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            <Sparkles size={11} /> CTT
                          </div>
                        )}
                        {p.categorie !== "Talak" && p.categorie !== "NextClass" && (
                          <div
                            style={{
                              padding: "5px 10px",
                              borderRadius: 8,
                              background: info.bg,
                              color: info.color,
                              fontSize: 12,
                              fontWeight: 600,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.niveau || info.label}
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, color: "#A79C8E" }}>{p.sessionsCumule || 0} j. cumulés</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
              display: "flex",
              background: "linear-gradient(to bottom, rgba(255,253,249,0.7) 0%, rgba(255,253,249,0.2) 100%)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              borderTop: "1px solid rgba(234,229,217,0.6)",
              padding: "8px 4px",
            }}
          >
            {["Tous", ...CATEGORIES.map((c) => c.id)].map((t) => {
              const info = t === "Tous" ? null : catInfo(t);
              const Icon = t === "Tous" ? LayoutGrid : info.icon;
              const active = tab === t;
              const count = t === "Tous" ? people.length : counts[t] || 0;
              return (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 2,
                    padding: "6px 2px",
                    border: "none",
                    background: "none",
                    color: active ? "#3D2645" : "#A79C8E",
                    cursor: "pointer",
                  }}
                >
                  <Icon size={18} />
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 500, textAlign: "center", lineHeight: 1.2 }}>
                    {t === "Tous" ? "Tous" : info.short}
                  </span>
                  <span style={{ fontSize: 9, color: active ? "#3D2645" : "#C2B9AC" }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {view === "form" && (
        <div className="no-scrollbar" style={{ padding: "18px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <button
              onClick={() => setView("list")}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}
            >
              <ChevronLeft size={22} color="#2B1F30" />
            </button>
            <h2 style={{ fontSize: 17, margin: 0, color: "#2B1F30" }}>Nouveau fruit</h2>
          </div>

          <label style={labelStyle}>Nom du fruit *</label>
          <input
            style={inputStyle}
            value={draft.nom}
            onChange={(e) => setDraft({ ...draft, nom: e.target.value })}
            placeholder="Ex: Espoir"
          />

          <label style={labelStyle}>Catégorie</label>
          <select
            style={inputStyle}
            value={draft.categorie}
            onChange={(e) => {
              const newCat = e.target.value;
              const opts = levelOptionsFor(newCat);
              setDraft({
                ...draft,
                categorie: newCat,
                niveau: opts.length ? (opts.includes(draft.niveau) ? draft.niveau : opts[0]) : "",
              });
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>

          {levelOptionsFor(draft.categorie).length > 0 && (
            <>
              <label style={labelStyle}>Niveau</label>
              <select style={inputStyle} value={draft.niveau} onChange={(e) => setDraft({ ...draft, niveau: e.target.value })}>
                {levelOptionsFor(draft.categorie).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Mode</label>
              <select style={inputStyle} value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value })}>
                <option>Offline</option>
                <option>Online</option>
              </select>
            </div>
            <div style={{ width: 90 }}>
              <label style={labelStyle}>JO</label>
              <input style={inputStyle} value={draft.jo} onChange={(e) => setDraft({ ...draft, jo: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Indoja — nom</label>
          <input style={inputStyle} value={draft.indojaNom} onChange={(e) => setDraft({ ...draft, indojaNom: e.target.value })} />
          <label style={labelStyle}>Indoja — groupe / région</label>
          <input style={inputStyle} value={draft.indojaGroupe} onChange={(e) => setDraft({ ...draft, indojaGroupe: e.target.value })} />
          <label style={labelStyle}>BBT — nom</label>
          <input style={inputStyle} value={draft.bbtNom} onChange={(e) => setDraft({ ...draft, bbtNom: e.target.value })} />
          <label style={labelStyle}>BBT — TJN</label>
          <input style={inputStyle} value={draft.bbtTjn} onChange={(e) => setDraft({ ...draft, bbtTjn: e.target.value })} />

          <label style={labelStyle}>Statut court (affiché sur la carte)</label>
          <input style={inputStyle} value={draft.statutCourt} onChange={(e) => setDraft({ ...draft, statutCourt: e.target.value })} placeholder="Ex: Transition vers B" />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Sessions / semaine</label>
              <input style={inputStyle} value={draft.sessionsHebdo} onChange={(e) => setDraft({ ...draft, sessionsHebdo: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Jours cumulés</label>
              <input style={inputStyle} value={draft.sessionsCumule} onChange={(e) => setDraft({ ...draft, sessionsCumule: e.target.value })} />
            </div>
          </div>

          <label style={labelStyle}>Dernier cours suivi</label>
          <input style={inputStyle} value={draft.dernierCours} onChange={(e) => setDraft({ ...draft, dernierCours: e.target.value })} />

          {draft.categorie === "Talak" && (
            <>
              <label style={labelStyle}>Date de Talak</label>
              <input type="date" style={inputStyle} value={draft.dateTalak} onChange={(e) => setDraft({ ...draft, dateTalak: e.target.value })} />
            </>
          )}

          <button
            onClick={saveDraft}
            style={{
              width: "100%",
              padding: "13px 0",
              borderRadius: 12,
              border: "none",
              background: "#3D2645",
              color: "#F5F2EA",
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Enregistrer
          </button>
        </div>
      )}

      {selected && (
        <div
          onClick={closeDetail}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(43,31,48,0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 40,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: modalMode === "editInfo" ? "62%" : "78%",
              background: "#FFFDF9",
              borderRadius: "20px 20px 0 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px 10px",
                borderBottom: "1px solid #EAE5D9",
                flexShrink: 0,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 500, color: "#2B1F30" }}>{selected.nom}</div>
                <div style={{ fontSize: 11, color: "#8A7F72" }}>
                  {selected.indojaNom || "—"}{selected.bbtNom ? ` / ${selected.bbtNom}` : ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {modalMode === "view" && (
                  <button
                    onClick={startEditInfo}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 5,
                      border: "1px solid #DDD8CE",
                      background: "#FFFDF9",
                      color: "#2B1F30",
                      borderRadius: 10,
                      padding: "6px 10px",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <RefreshCw size={13} /> Mettre à jour
                  </button>
                )}
                <button onClick={closeDetail} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                  <X size={20} color="#8A7F72" />
                </button>
              </div>
            </div>

            {modalMode === "view" && (
              <>
                <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
                  <div style={{ fontSize: 12, color: "#8A7F72", marginBottom: 8, fontWeight: 500 }}>Commentaires</div>
                  {(selected.journal || []).length === 0 && (
                    <div style={{ fontSize: 13, color: "#A79C8E" }}>Aucun commentaire pour l'instant.</div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {(selected.journal || []).map((j, i) => (
                      <div key={i} style={{ background: "#F5F2EA", borderRadius: 10, padding: "10px 12px" }}>
                        <div style={{ fontSize: 11, color: "#A79C8E", marginBottom: 3 }}>{j.date}</div>
                        <div style={{ fontSize: 13, color: "#3A332C" }}>{j.texte}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 14, borderTop: "1px solid #EAE5D9", flexShrink: 0 }}>
                  <button
                    onClick={() => setModalMode("addComment")}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "12px 0",
                      borderRadius: 12,
                      border: "none",
                      background: "#3D2645",
                      color: "#F5F2EA",
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    <MessageSquarePlus size={16} /> Ajouter un commentaire
                  </button>
                </div>
              </>
            )}

            {modalMode === "addComment" && (
              <>
                <div style={{ flex: 1, padding: "14px 16px" }}>
                  <label style={labelStyle}>Nouveau commentaire</label>
                  <textarea
                    autoFocus
                    value={journalText}
                    onChange={(e) => setJournalText(e.target.value)}
                    placeholder="Écris ta note ici..."
                    style={{ ...inputStyle, minHeight: 120, resize: "vertical", marginBottom: 0 }}
                  />
                </div>
                <div style={{ padding: 14, borderTop: "1px solid #EAE5D9", display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => { setModalMode("view"); setJournalText(""); }}
                    style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #DDD8CE", background: "#FFFDF9", color: "#2B1F30", fontSize: 14, cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={validateComment}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, border: "none", background: "#3D2645", color: "#F5F2EA", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    <Check size={16} /> Valider
                  </button>
                </div>
              </>
            )}

            {modalMode === "editInfo" && editDraft && (
              <>
                <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
                  <label style={labelStyle}>Nom du fruit</label>
                  <input style={inputStyle} value={editDraft.nom} onChange={(e) => setEditDraft({ ...editDraft, nom: e.target.value })} />

                  <label style={labelStyle}>Catégorie</label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                      style={{
                        flex: 1,
                        height: 42,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: "1px solid #C4B394",
                        fontSize: 13,
                        marginBottom: 12,
                        boxSizing: "border-box",
                        fontFamily: "inherit",
                        background: "#D9CBB0",
                        color: "#2B1F30",
                      }}
                      value={editDraft.categorie}
                      onChange={(e) => {
                        const newCat = e.target.value;
                        const opts = levelOptionsFor(newCat);
                        setEditDraft({
                          ...editDraft,
                          categorie: newCat,
                          niveau: opts.length ? (opts.includes(editDraft.niveau) ? editDraft.niveau : opts[0]) : "",
                        });
                      }}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditDraft({ ...editDraft, ctt: !editDraft.ctt })}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        height: 42,
                        padding: "0 12px",
                        borderRadius: 10,
                        border: editDraft.ctt ? "1px solid #D4AF37" : "1px solid #C4B394",
                        background: editDraft.ctt ? "#D4AF37" : "#D9CBB0",
                        color: "#2B1F30",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        marginBottom: 12,
                        boxSizing: "border-box",
                      }}
                    >
                      <Sparkles size={13} /> CTT
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    {levelOptionsFor(editDraft.categorie).length > 0 && (
                      <div style={{ flex: 1 }}>
                        <label style={labelStyle}>Niveau</label>
                        <select style={inputStyle} value={editDraft.niveau} onChange={(e) => setEditDraft({ ...editDraft, niveau: e.target.value })}>
                          {levelOptionsFor(editDraft.categorie).map((o) => (
                            <option key={o} value={o}>{o}</option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Mode</label>
                      <select
                        style={{
                          width: "100%",
                          height: 42,
                          padding: "0 12px",
                          borderRadius: 10,
                          border: "1px solid #C4B394",
                          fontSize: 13,
                          marginBottom: 12,
                          boxSizing: "border-box",
                          fontFamily: "inherit",
                          background: "#D9CBB0",
                          color: "#2B1F30",
                        }}
                        value={editDraft.mode}
                        onChange={(e) => setEditDraft({ ...editDraft, mode: e.target.value })}
                      >
                        <option>Offline</option>
                        <option>Online</option>
                      </select>
                    </div>
                    <div style={{ width: 70 }}>
                      <label style={labelStyle}>JO</label>
                      <input style={{ ...inputStyle, height: 42, boxSizing: "border-box" }} value={editDraft.jo} onChange={(e) => setEditDraft({ ...editDraft, jo: e.target.value })} />
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Indo</label>
                      <input style={inputStyle} value={editDraft.indojaNom} onChange={(e) => setEditDraft({ ...editDraft, indojaNom: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Groupe</label>
                      <input style={inputStyle} value={editDraft.indojaGroupe} onChange={(e) => setEditDraft({ ...editDraft, indojaGroupe: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>BBT</label>
                      <input style={inputStyle} value={editDraft.bbtNom} onChange={(e) => setEditDraft({ ...editDraft, bbtNom: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>TJN</label>
                      <input style={inputStyle} value={editDraft.bbtTjn} onChange={(e) => setEditDraft({ ...editDraft, bbtTjn: e.target.value })} />
                    </div>
                  </div>

                  <label style={labelStyle}>Statut court</label>
                  <input style={inputStyle} value={editDraft.statutCourt} onChange={(e) => setEditDraft({ ...editDraft, statutCourt: e.target.value })} />

                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Sessions / semaine</label>
                      <input style={inputStyle} value={editDraft.sessionsHebdo} onChange={(e) => setEditDraft({ ...editDraft, sessionsHebdo: e.target.value })} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Jours cumulés</label>
                      <input style={inputStyle} value={editDraft.sessionsCumule} onChange={(e) => setEditDraft({ ...editDraft, sessionsCumule: e.target.value })} />
                    </div>
                  </div>

                  <label style={labelStyle}>Dernier cours suivi</label>
                  <input style={inputStyle} value={editDraft.dernierCours} onChange={(e) => setEditDraft({ ...editDraft, dernierCours: e.target.value })} />

                  {editDraft.categorie === "Talak" && (
                    <>
                      <label style={labelStyle}>Date de Talak</label>
                      <input type="date" style={inputStyle} value={editDraft.dateTalak} onChange={(e) => setEditDraft({ ...editDraft, dateTalak: e.target.value })} />
                    </>
                  )}

                  <button
                    onClick={deleteSelected}
                    style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#A5432E", fontSize: 13, cursor: "pointer", padding: "6px 0" }}
                  >
                    <Trash2 size={14} /> Supprimer ce fruit
                  </button>
                </div>
                <div style={{ padding: 12, borderTop: "1px solid #EAE5D9", display: "flex", gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => setModalMode("view")}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid #DDD8CE", background: "#FFFDF9", color: "#2B1F30", fontSize: 14, cursor: "pointer" }}
                  >
                    Annuler
                  </button>
                  <button
                    onClick={saveEditInfo}
                    style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "11px 0", borderRadius: 12, border: "none", background: "#3D2645", color: "#F5F2EA", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                  >
                    <Check size={16} /> Enregistrer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {goalsOpen && (
        <div
          onClick={() => setGoalsOpen(false)}
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(43,31,48,0.35)",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 45,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxHeight: "58%",
              background: "#FFFDF9",
              borderRadius: "20px 20px 0 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid #EAE5D9" }}>
              <div style={{ fontSize: 16, fontWeight: 500, color: "#2B1F30" }}>Objectifs de la semaine</div>
              <button onClick={() => setGoalsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, display: "flex" }}>
                <X size={20} color="#8A7F72" />
              </button>
            </div>
            <div className="no-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>CTT</label>
                  <input style={inputStyle} value={goalsDraft.ctt} onChange={(e) => setGoalsDraft({ ...goalsDraft, ctt: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>BB group</label>
                  <input style={inputStyle} value={goalsDraft.bbGroup} onChange={(e) => setGoalsDraft({ ...goalsDraft, bbGroup: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>A, B</label>
                  <input style={inputStyle} value={goalsDraft.ab} onChange={(e) => setGoalsDraft({ ...goalsDraft, ab: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>C</label>
                  <input style={inputStyle} value={goalsDraft.c} onChange={(e) => setGoalsDraft({ ...goalsDraft, c: e.target.value })} />
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>D, E</label>
                  <input style={inputStyle} value={goalsDraft.de} onChange={(e) => setGoalsDraft({ ...goalsDraft, de: e.target.value })} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>TT</label>
                  <input style={inputStyle} value={goalsDraft.tt} onChange={(e) => setGoalsDraft({ ...goalsDraft, tt: e.target.value })} />
                </div>
              </div>
            </div>
            <div style={{ padding: 14, borderTop: "1px solid #EAE5D9", display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => setGoalsOpen(false)}
                style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #DDD8CE", background: "#FFFDF9", color: "#2B1F30", fontSize: 14, cursor: "pointer" }}
              >
                Annuler
              </button>
              <button
                onClick={saveGoals}
                style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "12px 0", borderRadius: 12, border: "none", background: "#3D2645", color: "#F5F2EA", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
              >
                <Send size={16} /> Exporter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
