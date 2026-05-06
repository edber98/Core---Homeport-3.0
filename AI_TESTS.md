# Cahier de tests — Assistant IA Homeport

Liste exhaustive des prompts à lancer pour valider chaque nouvelle fonctionnalité. Coche ✅ / ❌ / ⚠️ dans la marge. Si KO, récupère les logs backend (`[harness] tool ... error`) et envoie-les.

Pré-requis :
- Backend redémarré après toutes les dernières modifs
- `cd API && npm install && cd ../Homeport && npm install`
- `npx playwright install chromium` (pour web tools + Mermaid→PNG)
- Mode projet activé avec un Nextcloud/GDrive/Dropbox connecté

---

## 1. Messages structurés — `render_structured` (6 layouts)

### 1.1 chips_tabs (storyboard, variantes)
```
Je prépare le lancement d'un produit SaaS. Propose-moi 4 variantes de
landing page (minimaliste, premium, technique, storytelling). Affiche
avec des onglets cliquables en haut. Pour chaque : description, cible,
H1 exemple, palette couleurs.
```
→ Attendu : chips cliquables en haut, contenu qui change au click, **pas** de JSON/tableau recopié dans le texte autour.

### 1.2 stepped_plan (checklist d'actions)
```
Donne le plan étape par étape pour migrer un formulaire Mailchimp
vers un workflow Homeport avec captcha, enregistrement Odoo et notif
Slack. Indique durée et tools par étape.
```
→ Attendu : étapes numérotées, durée/tools en badge, **pas** de recopie markdown dans le texte.

### 1.3 comparison_table (comparatif)
```
Compare Slack, Teams, Discord et Mattermost pour une équipe tech 50p :
bot integrations, threads, voice/video, pricing, self-hosting, audit
logs. Tableau comparatif.
```
→ Attendu : NzTable avec colonnes par outil, rows par feature, bool → ✓/✗.

### 1.4 accordion (FAQ)
```
Prépare une FAQ client pour notre nouveau module automation :
6 questions courantes avec réponses détaillées. Accordéon.
```
→ Attendu : sections pliables, première ouverte.

### 1.5 timeline
```
Montre l'historique des releases majeures de n8n depuis 2019 :
versions + features marquantes. Timeline.
```
→ Attendu : dots colorés, dates formatées FR, à droite description.

### 1.6 card_grid
```
Propose 6 templates de workflow prêts à l'emploi pour une startup
early-stage : onboarding client, lead scoring, support ticket routing,
invoice reminder, slack digest, churn alerts. Grille de cartes avec
icône et bouton "Utiliser".
```
→ Attendu : grid responsive, boutons action par card.

---

## 2. Plan mode — `propose_plan`

```
Je veux automatiser toute la gestion des factures fournisseurs :
réception email → extraction → comptabilisation Odoo → validation
humaine > 5000€. AVANT de commencer, propose un plan détaillé avec
dépendances, durée, outils, risques. Je validerai ou modifierai.
```
→ Attendu : carte interactive inline avec checkboxes par étape, boutons "Approuver/Modifier/Rejeter", agent pause jusqu'à ta réponse.

---

## 3. Diagrammes — `generate_diagram`

### 3.1 Flowchart simple
```
Génère un flowchart qui illustre l'architecture Homeport :
user → frontend Angular → API Express → MongoDB, en parallèle agent IA
qui utilise tools + sandbox bubblewrap.
```
→ Attendu : SVG rendu inline, bouton "Copier code" + "Télécharger SVG".

### 3.2 Sequence diagram
```
Fais un diagramme de séquence : user upload PDF facture → web_download
→ execute_code (extraction vision) → generate_document xlsx →
project_write_file Nextcloud.
```

### 3.3 Mindmap
```
Génère un mindmap des capacités de l'agent IA Homeport : tools fichiers,
web, document, code, subagents, skills, mémoire — avec sous-branches.
```

### 3.4 Flowchart complexe (stress test)
```
Fais un diagramme complexe avec sous-graphes, boucles, chemins
alternatifs et gestion d'erreur pour un workflow de facturation
avec retry/backoff.
```
→ Attendu : si syntaxe Mermaid invalide, agent retente automatiquement ; si nouveau rendu fail, ancien SVG reste visible + badge discret `⟳`.

---

## 4. Recherche web profonde — `research_deep` / `spawn_subagent`

### 4.1 Étude de marché 4 axes parallèles
```
Étude de marché sur les plateformes iPaaS en Europe 2026.
Spawn 4 subagents en parallèle :
- Axe 1 : concurrents (top 10, pricing, positioning)
- Axe 2 : tendances tech (AI agents, MCP, RAG, multimodal)
- Axe 3 : demande marché (TAM/SAM, secteurs adopters)
- Axe 4 : stack technique (technos, patterns)
Chaque subagent décide lui-même combien de sources consulter.
Consolide dans render_structured comparison_table puis génère
/analyses/etude-marche-2026.xlsx.
```
→ Attendu : onglet Tâches du canvas montre l'arbre 4 subagents live, onglet Recherche montre URLs consultées avec tag par subagent, xlsx généré dans Nextcloud.

### 4.2 Research deep simple
```
research_deep({question:"Quels sont les 5 principaux standards MCP
publiés en 2026 et leurs implémentations ?"})
```
→ Attendu : timeline live dans onglet Recherche, citations avec URLs datées, synthèse textuelle.

---

## 5. Mémoire projet structurée — `get/set_project_knowledge`

### 5.1 Remplissage manuel
Va dans Paramètres → Connaissances projet → Ajouter une entrée :
- `client.name` = "Acme Corp" (text)
- `budget.total` = 50000 (number)
- `deadline` = 2026-06-30 (date)
- `contact.email` = contact@acme.fr (email)

### 5.2 Utilisation par l'agent
```
Génère un brief client pour notre projet en cours (utilise les infos
déjà en mémoire, ne me redemande rien).
```
→ Attendu : agent lit via `get_project_knowledge`, utilise `client.name`, `budget.total`, etc. sans demander.

### 5.3 Mise à jour par l'agent
```
Note que notre contact technique est Jean Dupont, email
jean.dupont@acme.fr, mobile +33612345678, dispo lundi-jeudi.
```
→ Attendu : agent appelle `set_project_knowledge` avec carte permission inline (ou auto selon autonomy).

---

## 6. PDF vision multimodal

```
Dans /Factures/ (ou /CBJ PJ12323/Factures/) lis toutes les factures PDF
via ta vision (pas de regex Python). Extrais N° facture, date,
fournisseur, HT, TVA, TTC, devise, catégorie (hébergement, SaaS,
transport...). Génère /analyses/factures-2026.xlsx avec :
- Onglet Détail (toutes colonnes)
- Onglet Synthèse par catégorie (total + %)
- Onglet Synthèse mensuelle + graphique bar
```
→ Attendu : agent utilise `project_read_file` qui renvoie content block multimodal type=document → GPT-4o/Claude lit le PDF avec vision → extrait précis. **Plus** d'extraction "partielle" ni de regex ratées.

---

## 7. Web download + charte graphique

```
Télécharge le logo de vercel.com, le favicon, les 2 polices principales,
et fais 2 screenshots de leur landing. Dépose le tout dans /assets/vercel/
du projet. Génère ensuite /analyses/charte-vercel.md avec les URLs,
couleurs hex extraites du CSS et palette.
```
→ Attendu : `web_fetch` page → extraction URLs → `web_download` pour chaque asset → `project_write_file({fileId})` pour upload Nextcloud. Pas de base64 recopié.

---

## 8. Skills docx/pptx/xlsx/pdf

### 8.1 Pitch deck pptx
```
Crée un pitch deck pptx de 8 slides pour présenter Homeport à un
investisseur : titre, problème, solution, produit, traction, business
model, équipe, ask. Utilise pptxgenjs avec theme brand (rose #e61982).
Dépose dans /pitch/homeport-deck.pptx.
```

### 8.2 QR code + PDF
```
Génère un QR code qui pointe vers https://homeport.io et intègre-le
dans un PDF A4 avec titre "Scan pour en savoir plus". Dépose dans
/marketing/qr-flyer.pdf.
```

### 8.3 CSV → XLSX
```
Dans /data/sales-2026.csv (que tu peux créer avec execute_code
si absent), agrège par mois et génère /analyses/sales-monthly.xlsx
avec un onglet détail + onglet pivot + graphique.
```

---

## 9. Execute code — Python / Node

### 9.1 Analyse données
```
Dans /data/sales.csv du projet, trouve les 10 clients avec le plus gros
CA en 2026, calcule leur croissance vs 2025, crée un graphique matplotlib.
Dépose /analyses/top-clients.png.
```

### 9.2 Parsing custom
```
Analyse le fichier /inputs/log.txt : extrait toutes les lignes contenant
"ERROR" avec la timestamp, regroupe par minute, trouve les bursts
(>10 errors/min). Retourne un rapport json dans /analyses/errors-report.json.
```

---

## 10. Installation dynamique — `install_package` (NOUVEAU)

### 10.1 Install Python
```
Il me manque le module "reportlab" pour générer des PDF avancés.
Installe-le avec install_package(python, reportlab), puis fais un PDF
A4 "Hello World" dans /out/test.pdf.
```
→ Attendu : carte permission inline "Installer reportlab (python) ?", tu autorises, install se lance, puis execute_code réussit.

### 10.2 Install Node
```
Installe "qrcode" côté node (install_package(node, qrcode)), puis
génère un QR base64 qui pointe vers homeport.io et affiche-le avec
display_image.
```

### 10.3 Package blacklisté (test sécu)
```
install_package(node, shelljs)
```
→ Attendu : erreur "Package shelljs blacklisté par l'admin" (protection par défaut).

---

## 11. Image inline — `display_image` (NOUVEAU)

### 11.1 Image depuis fileId
```
Affiche le logo C4RBON group que tu as récemment téléchargé
(file_mnz6fkem_... ou similaire) via display_image avec caption
"Logo officiel C4RBON".
```
→ Attendu : bulle assistant avec image inline + caption, **pas** recopie du fileId dans le texte.

### 11.2 Image depuis URL
```
display_image({url:"https://vercel.com/favicon.ico", caption:"Favicon Vercel"})
```
→ Attendu : figure avec image chargée, skeleton gris pendant le chargement, caption sous l'image, bouton "⋯" au hover (télécharger + copier URL + ouvrir en grand).

### 11.3 Zoom plein écran
Clique sur l'image affichée par display_image.
→ Attendu : modal 90vw avec fond noir, image centrée.

---

## 11bis. Regroupement visuel de messages (NOUVEAU)

### 11bis.1 Texte + widget dans la même bulle
```
Introduis ton plan d'action en 1 phrase, puis render_structured
(layout:stepped_plan) avec 3 étapes, puis continue par 1 phrase
explicative, puis render_structured (layout:card_grid) avec 3 cards.
```
→ Attendu : UN SEUL avatar à gauche, les 4 messages assistant (texte, widget, texte, widget) sont empilés serrés (6-8px) comme dans Claude.

### 11bis.2 Pas de regroupement user/assistant
Envoie un message utilisateur entre deux réponses.
→ Attendu : nouveau avatar assistant pour la deuxième bulle (car user intercalé).

---

## 11ter. Export de widgets (NOUVEAU)

### 11ter.1 Structured → CSV/XLSX/JSON/PDF
```
Render un comparison_table avec 3 outils (Slack/Teams/Discord) et 5
critères. Puis clique le bouton ⋯ sur la bulle.
```
→ Attendu : menu avec "Ouvrir en grand / Copier / JSON / CSV / XLSX / PDF".
Chaque export télécharge le bon format (CSV ouvre dans Excel, XLSX pareil, PDF contient le tableau rendu).

### 11ter.2 Diagram → SVG/PNG/PDF
```
generate_diagram(type:flowchart, title:"Pipeline", mermaid:"graph LR; A-->B-->C")
```
→ Attendu : bouton ⋯ permet Télécharger SVG (direct), PNG (via canvas), PDF (A4). Ouvrir en grand affiche le diagramme interactif en modal 90vw.

### 11ter.3 Plan proposal → JSON/PDF
```
propose_plan(summary:"Test export", steps:[{id:"s1", title:"Étape 1"}, {id:"s2", title:"Étape 2"}])
```
→ Attendu : export JSON retourne la structure, PDF rend la liste.

---

## 12. Permissions inline (destructive)

```
Supprime tous les fichiers .tmp du dossier /Logs/ du projet.
```
→ Attendu : carte permission inline "Autoriser une fois / session / toujours / Refuser" avec preview du path. Si "Toujours" : les prochaines `project_delete` ne redemanderont plus.

---

## 13. Mode autonomie

### 13.1 Prudent (demande pour chaque write/destructive)
Dans Paramètres → Préférences → Autonomy = Prudent.
```
Crée un nouveau dossier /test-prudent/ dans le projet.
```
→ Attendu : permission demandée même pour un write simple.

### 13.2 Autonomous (auto-allow safe/write, demande destructive uniquement)
Préférences → Autonomy = Autonomous.
```
Même prompt.
```
→ Attendu : création sans confirmation.

---

## 14. Combo complet (production-style)

```
Analyse https://linear.app : charte graphique (couleurs, fonts, spacings)
+ messages marketing clés + structure navigation. Lance 3 subagents en
parallèle (un par axe). Télécharge le logo + 2 captures via web_download.
Génère :
- /analyses/linear-brand.xlsx (3 onglets : couleurs / typo / spacings)
- /analyses/linear-messaging.md
- Diagramme Mermaid du sitemap (generate_diagram)
- /analyses/linear-assets/ avec logo + captures
Affiche un card_grid final qui résume les 4 livrables avec bouton
"Ouvrir" sur chaque.
```
→ Attendu : tu vois dans Canvas→Tâches les 3 subagents actifs en parallèle, dans Canvas→Recherche les URLs fetched, dans Canvas→Fichiers l'arbo mise à jour, dans Canvas→Document le diagramme Mermaid rendu. À la fin un card_grid inline dans le chat.

---

## 15. LivePreview (streaming visuel)

Pour chaque test ci-dessus, vérifie dans le chat :
- Pendant que l'agent tape le JSON des args → le widget se **construit progressivement** (chips apparaissent une à une, étapes se remplissent, mermaid se dessine)
- Pas de saccades UI
- Le badge "🔄 en cours" disparaît dès que le tool termine
- Pas de duplication texte/widget (l'agent ne recopie plus le contenu en markdown)

---

## Feedback à me donner par test

Pour chaque KO ou ⚠️ :
1. Numéro du test (ex: 1.3)
2. Ce qui a été affiché (screenshot si possible)
3. Dernière ligne des logs backend (`[harness] tool ... error` ou similaire)
4. Ce qui était attendu

Je debug point par point.

---

## ✨ NOUVEAU — Canvas interactif HTML (render_interactive_canvas)

Tous ces tests demandent un canvas HTML inline sandbox, mode streaming pendant la génération, puis rendu final dans une bubble 100% width ~420 à 520 px de haut. Bouton reload (relance l'animation), fullscreen, copy HTML, ouvrir dans nouvel onglet.

### CV-01 Cube 3D rotatif
```
Affiche-moi un cube bleu qui tourne en 3D avec Three.js.
```
Attendu : cube WebGL rotatif, badge « 3d », lumières ambiante + directional.

### CV-02 Logo sur cube
```
Affiche un cube 3D rotatif avec sur chaque face un logo texte « HP » en rose #e61982 sur fond blanc.
```
Attendu : texture procédurale (canvas 2D converti en THREE.CanvasTexture) appliquée aux 6 faces.

### CV-03 Sphère terrestre
```
Planète 3D qui tourne avec une texture Earth (utilise une URL publique), ambiance spatiale (fond noir, lumière directionnelle).
```

### CV-04 Système solaire mini
```
Système solaire simplifié : Soleil au centre + 4 planètes (Mercure, Vénus, Terre, Mars) qui tournent autour à vitesses différentes, taille proportionnelle simplifiée.
```

### CV-05 Camembert Chart.js
```
Camembert Chart.js avec 4 segments : 40% Desktop (bleu), 25% Mobile (vert), 20% Tablet (orange), 15% Autre (rouge). Avec tooltip au hover.
```

### CV-06 Multi-charts grid
```
Dashboard dans un seul canvas : line chart CA mensuel 2026, bar chart répartition produit, donut mix clients, gauge taux de conversion. 2x2 layout.
```
Attendu : 4 graphiques Chart.js dans une grid CSS, tous interactifs.

### CV-07 Animation physique — pendule simple
```
Animation 2D canvas : pendule simple avec les équations du mouvement (θ(t) = θ₀·cos(√(g/L)·t)). Affiche angle, période, et courbe d'oscillation en dessous.
```

### CV-08 Animation physique — interférence d'ondes
```
Illustre le principe d'interférence : 2 sources d'ondes circulaires dans un canvas 2D, avec les franges d'interférence visibles. Sliders pour écarter les sources et changer la fréquence.
```

### CV-09 Animation physique — chute libre avec friction
```
100 particules qui tombent en chute libre avec frottement de l'air + rebonds sur le fond. Couleurs aléatoires, légère traînée.
```

### CV-10 Visualisation algo — tri à bulles
```
Animation d'un tri à bulles sur 30 barres de hauteurs aléatoires. Vert quand trié, rouge pendant les swaps.
```

### CV-11 Animation vectorielle SVG
```
SVG animé : horloge analogique fonctionnelle avec aiguilles heures/min/sec qui bougent en temps réel.
```

### CV-12 Mode streaming live
Lance un prompt complexe (CV-04 ou CV-06). Observe la bubble :
- badge « en construction… » pendant le streaming
- l'iframe se repaint progressivement à chaque delta
- à la fin, dernier render propre, badge disparu

### CV-13 Fullscreen + copy
Sur n'importe quel canvas :
- Clic fullscreen → overlay noir plein écran
- Clic copy → HTML copié dans le presse-papier (colle dans un éditeur pour vérifier)
- Clic nouveau onglet → page standalone fonctionnelle

### CV-14 Fallback erreur
```
Affiche un canvas avec du code HTML volontairement cassé (<scrpt>...).
```
Attendu : iframe tente de render, si crash → affichage dégradé sans casser la page parent (sandbox).

---

## 🔎 Web search après bascule Brave

### WS-01 Recherche simple
```
Cherche-moi des news IA publiées cette semaine.
```
Attendu backend : `[web-tool:brave] query=... → N résultats`. Pas de 0. Temps < 10s.

### WS-02 Recherche avec guillemets
```
Cherche "OpenAI Responses API" documentation.
```

### WS-03 Fallback automatique
Si Brave renvoie 0 → log `[web-search] engine "brave" → 0 résultat, tentative fallback` → essai startpage puis duckduckgo.

---

## ⚡ Série finale — 9 nouvelles features

### JC Jauge contexte max

- **JC-01 Affichage pill header.** Ouvre une conversation. Dans les chat-actions du header, une pill colorée affiche `X%`. Hover → tooltip `12.4k / 400k tokens — gpt-5.2`.
- **JC-02 Couleurs seuils.** Envoie plusieurs messages jusqu'à dépasser 70% → pill devient **ambrée**. Dépasse 90% → **rouge pulsant**.
- **JC-03 Popover détail.** Clic sur la pill → popover avec tokens, modèle, nb messages, barre de progression colorée, bouton « Compacter et continuer » (visible seulement si ≥70%).
- **JC-04 Compact action.** Clic « Compacter et continuer » → envoie automatiquement un message qui déclenche `compact_and_transfer` → nouvelle thread avec résumé.
- **JC-05 Route backend.** Dans DevTools Network : à chaque nouveau message ou load de thread, un `GET /api/ai/threads/{id}/usage` renvoie `{tokens, limit, percent, model, messageCount}`.

### AR Artifacts side-panel

- **AR-01 Onglet apparaît.** Fais générer un diagramme / canvas / image / plan. Un onglet « Artefacts » apparaît dans le canvas droit avec un badge count.
- **AR-02 Liste et clic.** Clique l'onglet → liste chronologique descendante (plus récent en haut). Chaque card : icône par type (🧊🎨📊🖼️📋📝), titre, date, snippet. Clic → scroll vers le message correspondant + flash d'accent.
- **AR-03 Auto-bascule sur canvas_html.** Demande `affiche-moi un cube 3D` → le canvas s'ouvre ET bascule sur l'onglet « Artefacts ».
- **AR-04 Respect fermeture manuelle.** Ferme le canvas. Génère un nouveau canvas HTML → le canvas NE doit PAS se rouvrir automatiquement (respecte `_userClosedCanvas`). Change de thread → le reset, auto-open repart.

### AT Attachments intelligents

- **AT-01 Upload image → suggestions visuelles.** Drag-drop une image, laisse l'input vide. Sous les chips attachment, une barre « Suggestions : » affiche chips cliquables `Décrire` + `Extraire le texte`.
- **AT-02 Upload PDF.** Drag-drop PDF → chips `Résumer` + `Extraire données`.
- **AT-03 Upload Excel/CSV.** → chip `Analyser`. Audio → `Transcrire`. Vidéo → `Analyser`.
- **AT-04 Mixte.** Upload 1 image + 1 PDF ensemble → suggestions union des deux types, limitées à 3.
- **AT-05 Application d'une suggestion.** Clic sur chip → l'input se remplit avec le prompt, curseur positionné en fin de texte, prêt à envoyer.
- **AT-06 Disparition si user tape.** Dès que l'user commence à taper dans l'input, les suggestions disparaissent (elles reviennent si il efface tout).

### IE Inline edit message user

- **IE-01 Bouton edit hover.** Hover sur n'importe quel message user → icône `edit` apparaît en haut à droite.
- **IE-02 Passage en édition.** Clic edit → textarea préremplie avec le contenu, boutons `Annuler` + `Renvoyer`, hint « Les réponses ultérieures seront supprimées ».
- **IE-03 Renvoyer.** Modifie le texte, clic `Renvoyer` → les messages après (y compris la réponse assistant) sont supprimés, le nouveau message est envoyé, l'assistant re-génère.
- **IE-04 Annuler.** Clic `Annuler` → revient à l'affichage normal, rien changé.
- **IE-05 Désactivé si identique.** Si le texte édité = texte original, bouton `Renvoyer` désactivé.
- **IE-06 Backend cascade.** DevTools Network : `DELETE /api/ai/threads/{tid}/messages/{mid}` renvoie `{deleted: N}` (tous les messages à partir de cet id inclus).

### AD Auto-documentation projet

- **AD-01 Déclenchement.** En mode projet, fais 3-4 échanges avec activité significative (lecture fichiers, recherche, génération doc). Attends 5 min (debounce). Logs backend : `[project-doc-writer-hook] trigger START` puis `[sub-runner] RUN START project_doc_writer`.
- **AD-02 Card doc.overview.** Ouvre Settings → Connaissances projet. Tout en haut, une card pleine largeur « 📄 Documentation projet » s'affiche avec markdown rendu (sections Objectif / Fichiers / Décisions / TODO).
- **AD-03 Pas de spam.** Envoie 2 messages courts à la suite → debounce bloque le 2ᵉ trigger (< 5 min).
- **AD-04 Skip si pas d'activité.** Conversation purement conversationnelle (pas de tool call « significatif ») → le hook skip.
- **AD-05 Silence chat.** Le subagent `project_doc_writer` ne crée PAS d'agent_report visible dans le chat (comme memory_extractor).
- **AD-06 Kill stale.** Force le kill du process pendant le run → le resume-worker détecte, passe à `error: short_lived_subagent_stalled` sans retry infini.

### PT Prompt templates

- **PT-01 Création.** Settings → onglet « Prompts » → bouton `Nouveau template` → remplis nom/description/prompt/catégorie/tags → Enregistrer. Apparaît en card dans la grille.
- **PT-02 Search + filter.** Tape une partie du nom dans la barre search → filtre en live. Sélectionne une catégorie → filtre. Change le tri (Plus utilisés / Récents / Alphabétique).
- **PT-03 Partagé vs privé.** Crée un template avec switch `Partager` OFF → autre user du workspace ne le voit PAS. Avec switch ON → il le voit avec un cadenas si c'était privé.
- **PT-04 Utiliser.** Clic sur `Utiliser` d'une card → toast « inséré dans le chat » + l'input du chat se remplit avec le prompt complet.
- **PT-05 Compteur usage.** Après utilisation, le badge 🔥 increment de 1. Tri « Plus utilisés » met ce template en haut.
- **PT-06 Edit / delete.** Edit → modal préremplie → enregistrer. Delete → popconfirm → disparition.
- **PT-07 Seul le créateur.** Essaie d'éditer/supprimer un template d'un collègue → backend renvoie 403 `not_owner`.

### MG Memory graph visuel

- **MG-01 Toggle vue.** Settings → Connaissances projet → toolbar haut droite : 2 boutons radio `📱` (cards) / `🌐` (graphe). Par défaut cards. Bascule sur graphe.
- **MG-02 Rendu initial.** Les entries approuvées apparaissent comme nœuds colorés par type (texte=gris, number=bleu, date=violet, email=cyan, url=indigo, list=orange). Label sous chaque nœud = sous-partie de la clé.
- **MG-03 Relations auto.** Deux entries avec même namespace (ex: `client.nom` et `client.email`) → arête entre les deux. Tags communs → arête. Référence cross (value de A mentionne key de B) → arête plus épaisse.
- **MG-04 Force-directed animation.** À l'ouverture, les nœuds s'organisent via simulation physique (200 itérations), se stabilisent.
- **MG-05 Drag.** Drag un nœud → il suit la souris, la sim continue autour.
- **MG-06 Hover.** Hover sur nœud → agrandit + popup avec key/value/description.
- **MG-07 Clic.** Clic sur nœud → ouvre la modale d'édition de l'entry.
- **MG-08 Zoom/pan.** Molette → zoom. Drag fond → pan. Bouton `Réinitialiser` / `+` / `−`.

### CC Canvas collaboratif live

- **CC-01 Badges présence.** Partage une thread avec 2 autres users. Ouvre-la chez chacun en parallèle. Dans le header chat, 2 avatars colorés apparaissent (initiales) avec point vert de présence. Tooltip → noms des users en ligne.
- **CC-02 Notif join.** User 2 ouvre la thread → toast bleu chez user 1 : `👋 Alice a rejoint la conversation`.
- **CC-03 Limite 3 affichés.** 5 users connectés → 3 avatars visibles + pastille `+2` à la fin.
- **CC-04 Isolation.** Switche vers une autre thread (non partagée) → les badges disparaissent chez tous.
- **CC-05 Live events.** User 1 envoie un message → user 2 le voit apparaître en stream en temps réel sans refresh.

### SM Skill marketplace

- **SM-01 Création skill.** Settings → onglet « Skills » → `Nouveau skill` → remplis nom/description/langage/code/tags → Enregistrer. Card apparaît avec code en bloc sombre.
- **SM-02 Filter par langage.** Sélect `Tous langages` → liste tout. Sélectionne `Python` → filtre.
- **SM-03 Copier.** Clic `Copier` sur une card → le code est dans le presse-papier (colle dans un éditeur pour vérifier).
- **SM-04 Fork.** Clic icône `🌿 fork` → crée une copie `<name> (fork)` dans TON espace, shared=false par défaut. Badge `fork` dans la card originale s'incrémente.
- **SM-05 Partage workspace.** Switch `Partager` OFF à la création → autre user ne voit pas. ON → il voit mais ne peut pas éditer (bouton 403).
- **SM-06 Tri populaire.** Compteur 🔥 `useCount` s'incrémente à chaque `Copier`. Tri `Plus utilisés` place en haut.
- **SM-07 Cadenas si privé.** Card d'un skill privé du user courant → icône 🔒 dans le head.

---

## Rapport par test

Pour chaque KO : numéro test (ex: IE-03) + ce qui s'affiche vs attendu + console navigateur (erreurs fetch) + logs backend (ligne `[route ...]` correspondante).
