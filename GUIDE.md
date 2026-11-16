# Suivi des fruits — Étape 1 : mise en place (Windows + VS Code)

Architecture : **Google Sheet** (base de données) ← **Apps Script** (API) ← **application React** (Vercel).

## 0. Installer la nouvelle dépendance (tableau de bord → export PowerPoint)
`npm install pptxgenjs`

## Fichiers à copier pour cette version
Copie dans ton projet Vite : le dossier `src/` (remplace tout), `index.html` et `public/` (icônes + manifeste de l'installation). Nouveautés : `src/Extras.jsx` et `src/main.jsx`.
**Apps Script** : colle le nouveau `Code.gs`, exécute `setup()` une fois (il ajoute les lignes `code_admin`, `code_lecture`, `lecteurs` dans l'onglet `reglages` sans toucher au reste), puis **Déployer → Gérer les déploiements → ✏️ → Nouvelle version**.

## A. Tester tout de suite, sans Google (mode démo)
1. Dans ton projet Vite existant, **supprime** `src/App.jsx`, `src/App.css`, `src/index.css`, puis copie tout le dossier `src/` fourni dans ton `src/` (garde ton `main.jsx`, il convient).
2. Supprime `.env.local` (ou laisse `VITE_API_URL` vide) et lance `npm run dev`.
3. Connecte-toi avec ton prénom et le code `demo` (équipe), `admin` (administrateur) ou `lecture` (lecture seule). Les données de démonstration restent sur ton navigateur.

## B. Créer le Google Sheet et l'API
1. Va sur https://sheets.google.com → **Feuille de calcul vierge** → nomme-la « Suivi des fruits ».
2. Menu **Extensions → Apps Script**. Supprime le code existant, colle tout `apps-script/Code.gs`, **Enregistrer**.
3. Choisis la fonction **setup** dans la liste du haut → **Exécuter**. Accepte les autorisations (« Paramètres avancés » → « Accéder à … »).
   → les onglets `classes, fruits, commentaires, historique, objectifs, exports, reglages` sont créés.
4. Onglet **reglages** : remplace `CHANGE-MOI` par ton **code d'équipe** (celui que tu donneras aux ~15 utilisateurs).
5. **Déployer → Nouveau déploiement → type « Application Web »** : *Exécuter en tant que* : **Moi** ; *Qui a accès* : **Tout le monde**. Copie l'**URL de l'application Web** (finit par `/exec`).
6. Après chaque modification de Code.gs : **Déployer → Gérer les déploiements → ✏️ → Nouvelle version**.

## C. Brancher l'app
1. À la racine du projet, crée `.env.local` :
   `VITE_API_URL=https://script.google.com/macros/s/…/exec`
2. `npm run dev` → connexion avec ton prénom + le code d'équipe.
3. Dans l'app : bouton **Objectifs** (menu) pour régler les objectifs et créer une classe, **Importer Excel** pour reprendre tes données.

## D. Publier (GitHub + Vercel)
1. `git add . && git commit -m "Etape 1" && git push`
2. Vercel → ton projet → **Settings → Environment Variables** → ajoute `VITE_API_URL` (même valeur) → **Redeploy**.
3. iPhone : Safari → Partager → **Sur l'écran d'accueil** (expliqué aussi dans l'app : bouton « Installer l'app »). L'app s'ouvre en plein écran avec son icône ; il faut toujours internet : **pas de mode hors ligne**.

## Ce que fait l'étape 1
- Tableau : Liste / Cartes / Par enseignement / Par niveau, recherche, filtres (en bas sur mobile), objectifs par barres, CTT doré animé, « À relancer » (marqué à la main ou sans mise à jour depuis 14 jours).
- Fiche fruit + commentaires (auteur, date, modifiable/supprimable par son auteur) + historique.
- Création / mise à jour avec validation, alerte de doublon, historique automatique des changements de niveau/catégorie.
- Plusieurs utilisateurs : verrou côté serveur, détection de conflit (« garder ma version / la sienne »), rafraîchissement automatique toutes les 20 s.
- Export Excel, import Excel avec aperçu et doublons, Form Telegram (`🗼43MMJJ_ Mois Class`) : les changements de niveau ne sont marqués exportés qu'après **Confirmer l'export**.
- Archivage, restauration, suppression définitive avec saisie du nom, actions groupées (ordinateur : coche des lignes).

## Tableau de bord (ajouté)
Menu « Vues → Tableau de bord » (l'autre vue s'appelle « Fruits par classe ») (onglet sur mobile) : 4 indicateurs, évolution par semaine (7 semaines, cumulé ou par semaine, niveaux à afficher), export image PNG et PowerPoint (graphique modifiable), objectifs, répartition par niveau, changements récents, à relancer, activité de l'équipe.
L'évolution est reconstruite depuis l'onglet `historique` ; le CTT est maintenant aussi historisé (redéploie Code.gs : **Déployer → Gérer les déploiements → Nouvelle version**). Les semaines avant cette mise à jour utilisent la valeur CTT actuelle.
Le trait en pointillés est l'objectif de la classe réparti de façon linéaire sur les 7 semaines.

## Objectifs par classe
- **Modifier** : le crayon à droite des barres d'objectifs (ou « Définir les objectifs de cette classe » s'il n'y en a pas encore), ou le bouton « Modifier » du tableau de bord. La fenêtre porte le nom de la classe ouverte.
- **Objectif de la classe** : CTT, BB group, A,B, C, D,E, TT, avec le nombre actuel à côté.
- **Cibles par semaine** : une grille niveau × semaine (les 7 semaines du graphique). Case vide = progression linéaire (valeur grisée). Bouton « Remplir en progression linéaire » pour partir d'une base.
- **À la création d'une classe** : les objectifs se saisissent dans la même fenêtre, avec « Reprendre les objectifs de… » une autre classe.
- Aucun changement du Google Sheet : les cibles hebdomadaires sont enregistrées dans l'onglet `objectifs` (colonne `cle` du type `ab@2026-11-09`).

## Archiver / désarchiver une classe
Dans « Toutes les classes », le bouton **Archiver** à droite de chaque classe (confirmation demandée). Une classe archivée quitte les onglets et passe dans la section repliable **Anciennes classes**, où **Désarchiver** la remet. On peut l'ouvrir pour la consulter : un bandeau « Classe archivée » avec le bouton « Désarchiver » s'affiche. Fruits, objectifs et historique sont conservés. Dans le Google Sheet : colonne `archivee` de l'onglet `classes`.
Le formulaire de création demande aussi le **début de la classe**, qui sert à trier les classes de la plus récente à la plus ancienne.

## Classes
Les onglets montrent les 4 classes les plus récentes (la classe ouverte reste toujours visible). Le bouton « Toutes les classes (n) » ouvre une liste avec recherche et nombre de fruits : prévu pour des dizaines de classes. Sur mobile, le nom de la classe ouverte est un bouton qui ouvre cette même liste.
Bouton **+** à droite des onglets de classe (liste déroulante + bouton + sur mobile). Chaque classe a ses fruits, ses objectifs et son historique.

## Par niveau / Par enseignement
Chaque groupe a sa barre latérale colorée (couleur du niveau) et son titre coloré.

## Limites connues (étape 2)
Mode hors ligne (file IndexedDB), PWA installable avec icônes, annulation (undo).
Le code d'équipe circule dans chaque requête : c'est un accès simple, pas une sécurité forte — ne mets pas de données sensibles.


## Barre des classes et menu « ⋯ »
- 1 ou 2 classes actives : onglets. **À partir de 3** : une liste déroulante (nom + nombre de classes) qui ouvre la liste avec recherche et « Anciennes classes ». Le bouton **+** reste toujours visible.
- Le menu **⋯**, à droite du nom de chaque classe (onglets, liste déroulante et liste des classes), agit sur cette classe : **Renommer** (nom unique), **Modifier les objectifs**, **Exporter l'Excel de la classe**, **Passer des fruits à une autre classe**, **Archiver / Désarchiver**.

## Passer des fruits à la classe suivante
⋯ → « Passer des fruits… » : classe de destination, **Déplacer** (l'historique suit le fruit) ou **Copier** (avec ou sans commentaires), coche des fruits (les « Next class » sont déjà cochés ; ils peuvent devenir GBB ou Indiv BB). Un bouton **Annuler** reste 6 secondes.

## Annuler
Après : archivage d'un fruit, archivage/désarchivage d'une classe, changement rapide de niveau ou catégorie, transfert de fruits. (La suppression d'un commentaire garde sa confirmation.)

## Recherche et actions rapides
- La recherche affiche aussi « Aussi dans d'autres classes (n) » (dès 2 lettres) ; toucher un résultat ouvre sa fiche dans sa classe.
- Sur mobile, **balayer un fruit vers la gauche** : niveau, catégorie, commentaire, ouverture de la fiche.

## Rôles : administrateur, équipe, lecture seule
Dans l'onglet `reglages` :
- `code_equipe` : lecture + écriture (comme avant).
- `code_admin` : comme l'équipe, plus le bouton **Accès** pour désigner qui est en lecture seule.
- `code_lecture` (facultatif) : un code qui ne permet jamais d'écrire.
- `lecteurs` : prénoms en lecture seule, gérés depuis le bouton **Accès** (admin uniquement). Ils utilisent le code d'équipe mais ne peuvent rien modifier.
Le blocage est fait **côté serveur** (« LECTURE_SEULE »), l'interface masque aussi les boutons de modification. Limite : la liste par prénom repose sur le prénom saisi à la connexion ; pour une personne extérieure, donne le `code_lecture`.

## Animations
Nouveau fichier `src/anim.jsx` + styles dans `src/index.css`. Pastille de niveau qui « pop » au changement (confettis pour TT), compteurs et barres qui se remplissent, graphique qui se dessine, lignes en cascade, changement de classe en glissement, soulignement jaune qui glisse entre les onglets, lignes archivées qui se replient, fruits qui s'envolent vers la barre des classes après un transfert (+n), menu ⋯ qui se déploie depuis le point touché, balayage à ressort, squelettes de chargement, coche animée et compte à rebours sur « Annuler », raisin qui se balance à la connexion. Tout est désactivé automatiquement si l'appareil réduit les animations.
