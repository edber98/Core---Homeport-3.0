# Kinn Pitch — Notes présentateur (v7)

**Durée vidéo** : 6 min 17 s · **Durée présentation orale** : 10 min
**Composition** : `KinnPitch` (1920×1080 @ 30fps · 11 310 frames)

La vidéo sert de support visuel pendant que vous parlez. Chaque scène laisse des temps de respiration : si vous parlez plus lentement, mettez en pause et reprenez.

**Chiffres officiels** (sources : ABBYY, ProcessMaker 2025) :
- **30 %** du temps de travail gaspillé chaque jour
- **11 h** / semaine perdues par collaborateur en tâches sans valeur
- **62 %** des entreprises ont des outils déconnectés
- **60+** services / connecteurs intégrés dans Kinn
- **Finance** : 15 → 2 min / facture (-80 % d'erreurs)
- **Industrie** : 45 → 8 min / détection (-60 % pannes)

---

## Plan général

| # | Scène | Durée | Plage frames | Timecode |
|---|---|---|---|---|
| **P00** | **Histoire C4RBON → Kinn** | 25 s | 0 – 750 | 0:00 |
| P01 | Hook — Le problème | 15 s | 750 – 1200 | 0:25 |
| P02 | Workflows — Connexion | 22 s | 1200 – 1860 | 0:40 |
| **P03** | **DÉMO 1 — Workflow IA (carte visite)** ⭐ | 57 s | 1860 – 3570 | 1:02 |
| P04 | Pont Workflow ↔ Agents | 24 s | 3570 – 4290 | 1:59 |
| P05 | Agents IA — L'équipe | 18 s | 4290 – 4830 | 2:23 |
| **P06** | **DÉMO 2 — Étude marché c4rbon** ⭐ | 76 s | 4830 – 7110 | 2:41 |
| P07 | Sandbox — L'agent code | 25 s | 7110 – 7860 | 3:57 |
| P08 | Permissions | 20 s | 7860 – 8460 | 4:22 |
| P09 | Trigger email — Workflow + agent | 22 s | 8460 – 9120 | 4:42 |
| P10 | **R&D** — Confidentialité (laboratoire) | 28 s | 9120 – 9960 | 5:04 |
| P11 | Cas d'usage — Plus-value entreprise | 30 s | 9960 – 10860 | 5:32 |
| P12 | Closing — kinn.fr | 15 s | 10860 – 11310 | 6:02 |

---

## P00 · Histoire C4RBON → Kinn *(0:00 – 0:25)*

**Visuel** : logo C4RBON GROUP grand au centre → se réduit en haut → timeline 4 jalons (2021 Création i55 · 2022 Application terrain · 2023 Intégration IA · 2024 i55 devient C4RBON GROUP) qui se remplissent au fil de l'apparition des cards → logo KINN en bas "aboutissement logique de 4 ans de terrain et de R&D" + citation *« Les entreprises n'ont pas besoin de nouveaux outils. Elles ont besoin qu'ils se parlent. »*

**À dire** — **25 s · 63 mots · 151 mots/min** (tenable à débit posé) :

> C4RBON GROUP, c'est **quatre ans de terrain**. En 2021, nous créions i55 pour faire parler les ERP, les CRM et les machines des industriels. En 2022, nous automatisions. En 2023, nous intégrions l'IA. Et en 2024, i55 est devenu C4RBON GROUP. **Kinn est l'aboutissement de cette aventure.** Notre conviction : les entreprises n'ont pas besoin de nouveaux outils — elles ont besoin qu'ils se parlent.

**Découpage phrase par phrase** pour se caler sur le visuel :

| Phrase | Timecode | Visuel correspondant |
|---|---|---|
| *"C4RBON GROUP, c'est quatre ans de terrain."* | 0:00 – 0:04 | Logo C4RBON grand au centre |
| *"En 2021… industriels."* | 0:04 – 0:09 | Card 2021 apparaît (bleu) |
| *"En 2022, nous automatisions."* | 0:09 – 0:12 | Card 2022 apparaît (vert) |
| *"En 2023, nous intégrions l'IA."* | 0:12 – 0:15 | Card 2023 apparaît (violet) |
| *"Et en 2024, i55 est devenu C4RBON GROUP."* | 0:15 – 0:19 | Card 2024 apparaît (noir) |
| *"Kinn est l'aboutissement de cette aventure."* | 0:19 – 0:21 | Logo KINN émerge |
| *"Notre conviction : les entreprises… qu'ils se parlent."* | 0:21 – 0:25 | Citation affichée |

**⚠ Si vous parlez plus lentement** : marquez une pause de 2 s après la citation, la scène tient jusqu'à 0:25.

---

## P01 · Hook — Le problème *(0:25 – 0:40)*

**Visuel** : fond clair, 6 logos d'apps qui flottent reliés par des traits rouges chaotiques. Titre *"Vos logiciels ne se parlent pas."* 3 stats alignées en bas : **30 %**, **11 h**, **62 %**. Source citée (ABBYY · ProcessMaker 2025).

**À dire (≈ 45 s)** :
> Dans 100 % des PME qu'on accompagne, on entend la même chose : les logiciels ne se parlent pas entre eux. Un commercial saisit une affaire dans le CRM, la compta la ressaisit dans l'ERP, le chef de projet la recopie dans Notion, et quelqu'un finit par prévenir Slack.
>
> Résultat : **30 % du temps de travail** gaspillé en tâches manuelles. **11 heures par semaine** par collaborateur perdues à recopier, vérifier, corriger. Et **62 % des entreprises** ont des outils totalement déconnectés, des décisions prises sur des données non consolidées. Voilà le terrain sur lequel on intervient.

---

## P02 · Workflows — Connexion *(0:15 – 0:37)*

**Visuel** : prompt utilisateur affiché en haut *"Quand une facture arrive dans Gmail, extrais les données, crée-la dans Odoo, encaisse avec Stripe, et préviens l'équipe sur Slack."* — puis chaque étape du pipeline s'allume : Gmail → Kinn AI (nœud IA rose) → Odoo → Stripe → Slack, avec particules qui circulent.

**À dire (≈ 50 s)** :
> La première brique de Kinn, ce sont les **workflows**. Vous décrivez en langage naturel ce que vous voulez faire, comme ici : *"quand une facture arrive, extrais, crée, encaisse, préviens"*. Kinn construit le tuyau.
>
> L'information circule automatiquement entre Gmail, Odoo, Stripe et Slack. Aucune action humaine nécessaire à chaque exécution. Remarquez le **nœud IA au centre** : n'importe quelle étape peut être étoffée, structurée ou corrigée par l'IA. L'intelligence est dans le flux.

---

## P03 · DÉMO 1 — Workflow IA (carte visite) *(0:37 – 1:47) ⭐*

**Visuel** : interface Kinn réelle, Flow Builder à gauche + panneau IA à droite. Segmented control **Éditeur / Simulation / Historique / Paramètres** **parfaitement centré** au-dessus du canvas.

**Déroulé en 6 étapes** :
1. **Prompt** (frames 0-360) : la souris clique dans le composer du panel IA à droite, le texte se tape lettre par lettre : *"Crée un formulaire qui prend une image en argument. Analyse-la, extrait les informations de contact et ajoute-les automatiquement dans Odoo."* Click sur Envoyer.
2. **Planification IA** (frames 360-640) : le canvas reste **vide**. Kinn affiche au centre une carte *"Kinn planifie votre workflow"* avec 4 étapes de réflexion qui se cochent (Analyse du besoin → Identification des outils → Séquencement → Préparation du canvas). Dans le chat, l'IA liste ce qu'elle va créer.
3. **Construction** (frames 640-920) : les 5 nœuds apparaissent alors un par un, **verticalement, sans branche** : Formulaire → Hedy Vision → Extraire contact → Odoo → Notification.
4. **Lancer** (frames 1020-1150) : la souris descend vers le bouton **Lancer** vert en bas du builder, click.
5. **Exécution** (frames 1150-1700) : une photo de carte de visite arrive ("Sophie Laurent · NovaTech"), chaque nœud passe en "exec → done", les champs extraits apparaissent à droite du flow.
6. **Odoo** (1700+) : notification Odoo *"Nouveau contact créé"* apparaît latéralement.

**À dire (≈ 2 min 15 s)** :
> On passe à la démo. À gauche, le Flow Builder de Kinn. À droite, le panneau IA toujours ouvert.
>
> *[la souris tape dans le panel IA]* — Je tape un besoin très concret : je voudrais un formulaire qui accepte une photo de carte de visite, qui extrait automatiquement les coordonnées, et qui pousse le contact dans Odoo. Je n'ai pas besoin de savoir coder.
>
> *[phase de planification — le canvas est vide]* — Remarquez : **rien ne se construit encore**. Kinn commence par **réfléchir**. Il analyse le besoin, identifie les outils nécessaires, séquence les étapes. C'est important : ce n'est pas un générateur de templates. C'est une IA qui raisonne sur votre demande.
>
> *[les nœuds apparaissent un par un]* — Une fois la planification terminée, Kinn dépose les briques : le formulaire avec son champ image, l'agent Hedy qui fait la vision, une étape d'extraction structurée, le connecteur Odoo, et la notification Slack. **En vertical, sans branches, simple à lire**.
>
> *[click sur Lancer]* — On teste. Je clique sur **Lancer**.
>
> *[la carte de visite apparaît et défile]* — Une photo de carte arrive : Sophie Laurent, directrice commerciale chez NovaTech. Hedy lit l'image, identifie les zones de texte, extrait nom, fonction, société, email, téléphone. Et en quelques secondes, **Odoo reçoit une notification : nouveau contact créé**. Une carte physique est devenue un lead qualifié, **sans qu'un humain n'ait touché au clavier**.

---

## P04 · Agents IA — L'équipe *(1:47 – 2:05)*

**Visuel** : arbre hiérarchique bien centré. Denis (chef d'orchestre, rose) en haut. 3 sous-agents espacés (Tim/Ada/Donald). 3 sous-sous-agents sous chacun. **Plus aucun chevauchement** avec le sous-titre.

**À dire (≈ 40 s)** :
> La deuxième brique, ce sont les **agents IA**. Imaginez une équipe de spécialistes virtuels : un explorateur web, un analyste de données, un rédacteur, un exécuteur de code, un logicien…
>
> Ils fonctionnent **comme une équipe humaine**. Un chef d'orchestre reçoit votre demande, la découpe, et délègue. Et si un spécialiste a besoin d'aide, **il peut lui-même mobiliser d'autres agents** — la profondeur est illimitée. Vous ne parlez pas à une IA, vous parlez à une **organisation intelligente**.

---

## P05 · DÉMO 2 — Étude de marché avec c4rbon.group *(2:05 – 3:35) ⭐*

**Visuel** : interface Kinn, la souris clique sur le bouton Assistant IA du header. Le prompt multi-lignes se tape (*"Étude de marché iPaaS Europe 2026, 2 axes, charte c4rbon.group, export xlsx"*). Denis répond **mot par mot**. Canvas inline de Tim et Ada apparaissent dans le chat. Donald assemble avec le **vrai logo C4RBON** téléchargé depuis leur site. Le xlsx final s'affiche avec la charte.

**À dire (≈ 2 min 40 s)** :
> Démo plus ambitieuse. J'ouvre l'assistant, je lui demande une étude de marché complète sur les iPaaS européens pour 2026 — deux axes, concurrents et tendances techniques. Et je veux le livrable aux couleurs de mon client **c4rbon.group**.
>
> *[Denis répond progressivement]* — Denis me répond mot par mot. Il annonce sa stratégie : trois experts mobilisés en parallèle.
>
> *[canvas apparaissent inline]* — Les canvas s'ouvrent **directement dans la conversation**. C'est une innovation de Kinn — les agents ne parlent pas juste, ils produisent des artefacts interactifs.
>
> *[Tim et Ada travaillent]* — Tim ramène les concurrents : Zapier, Make, n8n, Workato… Ada synthétise les tendances : MCP, RAG, multimodal.
>
> *[Donald assemble]* — Donald va chercher la charte c4rbon.group, applique les couleurs, la typo, **et télécharge le vrai logo C4RBON depuis leur site**. Il génère l'Excel.
>
> *[le xlsx s'ouvre]* — Voici le livrable. Trois onglets, en-tête **C4RBON GROUP** avec leur logo hexagonal officiel, colonnes concurrents, pricing, positionnement. Kinn mis en avant comme le concurrent français. **Moins de deux minutes pour ce qu'un stagiaire ferait en deux jours.**

---

## P06 · Sandbox — L'agent code *(3:35 – 4:00)*

**Visuel** : Alan exprime son besoin ("grille tarifaire zapier.com, pas d'API — je scrape"). Éditeur Python au centre (requests + BeautifulSoup), terminal en bas, 4 badges sécurité à gauche.

**À dire (≈ 50 s)** :
> Question naturelle : que se passe-t-il quand un agent rencontre un besoin pour lequel **aucun outil n'existe** ? Par exemple, récupérer la grille tarifaire d'un concurrent qui n'expose pas d'API.
>
> *[Alan écrit du code]* — L'agent **écrit du code Python** à la volée et va scraper la page HTML.
>
> *[terminal + badges]* — Tout dans une **sandbox Docker isolée** : conteneur éphémère, sortie réseau whitelistée, limites CPU/RAM strictes, logs audités. Détruit après exécution. **Liberté du code + sécurité du sandboxing**.

---

## P07 · Permissions *(4:00 – 4:20)*

**Visuel** : 3 modes à gauche (Prudent / Équilibré / Autonome) qui s'activent l'un après l'autre. À droite, carte de demande de permission ("envoyer 12 relances") avec Approuver / Refuser.

**À dire (≈ 40 s)** :
> Confier vos processus à une IA peut faire peur. Kinn vous laisse **configurer le niveau de contrôle**.
>
> *[3 modes]* — Trois niveaux d'autonomie. Prudent, Équilibré, Autonome.
>
> *[demande de permission]* — L'agent détecte qu'il va faire quelque chose d'impactant — 12 emails clients — et **il vous demande la permission**, avec tout le contexte. Vous gardez la main.

---

## P08 · R&D Confidentialité *(4:20 – 4:48)*

**Visuel** : Badge *"EN R&D · PAS ENCORE ACTIF EN PRODUCTION"* en haut. Titre *"Puissant ET confidentiel."*
**UN SEUL cercle** centré dans la moitié gauche, dessiné progressivement par un gradient. 5 étapes numérotées (1→5) disposées autour : Vos données → LLM local Anonymise → LLM puissant → LLM local Désanonymise → Réponse finale. Au centre, *"RGPD ready · Boucle fermée"*. À droite, **panneau descriptif dynamique** qui change à chaque étape : titre, description, liste d'actions concrètes, + un visualiseur qui montre les valeurs `Martin Dupont` se transformer en `PER_8a3f`.

**À dire (≈ 55 s)** :
> Un mot sur notre **laboratoire R&D** — je précise d'emblée : **ce qui suit n'est pas encore actif en production**, c'est sur quoi notre équipe travaille actuellement.
>
> On est lucides : on ne va pas concurrencer OpenAI ou Anthropic sur la puissance pure. Mais on a une idée pour **les utiliser sans leur exposer vos données**.
>
> *[cercle qui se dessine, panneau de droite qui suit]* — Quand un agent a besoin de raisonner sur vos données, un **petit modèle local** fait une première passe. Il détecte les informations sensibles — noms, emails, IBAN, chiffres d'affaires — et les **remplace par des identifiants anonymes**. Vous voyez à droite : *"Martin Dupont"* devient *"PER_8a3f"*, en direct.
>
> *[étape 3 → 5]* — Le modèle puissant raisonne sur les pseudo-identifiants. Au retour, **le modèle local réassocie les vraies valeurs**. Vous récupérez le livrable complet avec vos vraies données, **sans qu'elles n'aient jamais quitté votre périmètre**. On espère activer ça d'ici quelques mois.

---

## P09 · Trigger email — Workflow + agent *(4:48 – 5:10)*

**Visuel** : 3 colonnes horizontales. **Déclenchement** (email + mini-workflow) · **Analyse IA** (Ada extrait les champs) · **Actions parallèles** (Odoo/Slack/Gmail qui s'exécutent simultanément avec badge PARALLÈLE). Label dynamique en haut qui change à chaque phase.

**À dire (≈ 40 s)** :
> Dernier exemple : workflow + agent. Une facture fournisseur arrive à 9h14. Le **trigger Gmail** déclenche le workflow.
>
> *[Ada extrait]* — Ada lit, comprend, extrait les champs structurés : fournisseur, montant, échéance, PO, et **la catégorie comptable** — fait par l'IA, pas par une règle.
>
> *[3 actions en parallèle]* — Trois actions se déclenchent en même temps : **Odoo** enregistre, **Slack** alerte l'équipe, **Gmail** archive. Trois logiciels, trois actions, zéro humain.

---

## P10 · Closing *(5:10 – 5:25)*

**Visuel** : 3 pillars (Connecter / Automatiser / Déléguer), logo **KINN** avec glow, tagline *"Automatisation assistée. Intelligence intégrée."*, baseline *"La plateforme française d'automatisation et d'agents IA — souveraine, interopérable, gouvernée."*, URL **kinn.fr** + CTA.

**À dire (≈ 30 s)** :
> Pour résumer : Kinn, c'est **trois piliers**. **Connecter** 60+ logiciels. **Automatiser** avec des workflows visuels. **Déléguer** aux agents IA.
>
> Plateforme **française et souveraine**, pour les équipes qui veulent automatiser sans perdre le contrôle de leurs données. Rendez-vous sur **kinn.fr** pour une démo.

---

## Conseils de diction

- **P03 et P05** sont les scènes majeures — ralentissez, pointez les détails.
- **"Sans action humaine"** (P02) et **"Vous gardez la main"** (P07) : phrases-clés à marquer.
- **P08** : **insistez sur "en R&D"** — c'est la roadmap, pas le pitch actuel.
- **Les chiffres** (30 %, 11 h, 62 %) viennent d'ABBYY et ProcessMaker. Citez la source à la demande.
- La **phase de planification IA** en P03 (canvas vide + Kinn qui réfléchit) est importante : montrez qu'on n'est pas dans du générateur de template, l'IA **raisonne**.

## Paramètres techniques

```bash
cd MotionDesign
npm start                                      # Studio live
npx remotion render KinnPitch out/pitch.mp4    # rendu final (5:25)
npx remotion still KinnPitch out/check.png --frame=8200  # vérif ponctuelle
```

Résolution : 1920×1080, 30 fps, 9750 frames. Audio : insérez voix-off dans `public/`, décommentez le bloc `<Audio>` dans `src/KinnPitch.tsx`.

## Historique des corrections

**v4** (23 avr) :
- Cercle P08 recentré (centerX 540 → 660) dans la moitié gauche hors panel
- Un seul cercle continu avec gradient (fini les arcs séparés)
- Phase de planification IA en P03 — canvas vide tant que l'IA n'a pas fini de réfléchir
- Segmented control de P03 centré absolument
- Cursor clicks alignés sur les vraies coordonnées UI
- Denis de P04 descendu pour ne plus chevaucher le sous-titre
- **Vrai logo C4RBON** téléchargé depuis c4rbon.group/img/logo_noir.png

**v3** : 3D paper effect, logos → lucide-react, fond blanc, alignements généraux
**v2** : chiffres officiels (30/11/62), agents icônes, nouveau slogan
**v1** : composition initiale 9 scènes
