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
