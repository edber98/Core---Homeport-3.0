  - Le logiciel affiché à chaque étape (cross-logiciel ET processus) : « Devis créé → Dolibarr
  », « Email reçu → Email », « Projet créé → OpenProject », « Dossier créé → Nextcloud ».
  L'email apparaît bien dans le flux de facturation.
  - Anomalies par dossier (plus chaque fichier à la racine) + origine claire : « Cartonage
  Chateau de Nextcloud non rattaché — ressemble à Cartonnage du Château (nom saisi à la main ?)
  » + le chemin.
  - Retards explicites : « Commande O201 (Dolibarr) bloquée en validée depuis 34j ».
  - Goulots détaillés : « Processus Facturation : émise → payée = 8j sur 4 cas — point de
  ralentissement ».
  - Articles/lignes : lines ajouté aux mappings facture/devis/commande (capture les articles si
  présents ; le détail complet par article nécessite un fetch par-entité — prévu).

  📋 Logiciels open-source à brancher pour les tests (ta demande)

  Production industrielle (le plus important pour toi — nomenclatures, OF, suivi, capteurs) :

  ┌──────────────────┬─────────────────────────────────────────────────┬───────────────────┐
  │     Logiciel     │                    Pourquoi                     │   Remplissable    │
  │                  │                                                 │ comme Dolibarr ?  │
  ├──────────────────┼─────────────────────────────────────────────────┼───────────────────┤
  │ ERPNext (ou Odoo │ Module Manufacturing : nomenclatures (BOM),     │                   │
  │  Community)      │ ordres de fabrication, suivi de production,     │ ✅ oui, idéal     │
  │                  │ stocks. API REST complète                       │                   │
  ├──────────────────┼─────────────────────────────────────────────────┼───────────────────┤
  │ Home Assistant   │ Capteurs bâtiment/site (température, énergie,   │ ✅                │
  │ (déjà branché)   │ présence) → famille industry + Measurement      │                   │
  ├──────────────────┼─────────────────────────────────────────────────┼───────────────────┤
  │ Node-RED +       │ Ingestion capteurs temps-réel (OPC-UA/MQTT),    │ ✅ flux capteurs  │
  │ Mosquitto (MQTT) │ retours machine                                 │                   │
  ├──────────────────┼─────────────────────────────────────────────────┼───────────────────┤
  │ Grafana +        │ Séries temporelles / OEE / TRS d'un site        │ ✅ métriques      │
  │ InfluxDB         │                                                 │                   │
  └──────────────────┴─────────────────────────────────────────────────┴───────────────────┘

  Autres domaines à forte valeur :

  ┌────────────────────────────────────┬────────────────────────────────────────────────────┐
  │              Domaine               │               Open-source recommandé               │
  ├────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Support/tickets                    │ Zammad ou GLPI (GLPI = aussi parc IT)              │
  ├────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Marketing                          │ Mautic                                             │
  ├────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Analytics web                      │ Matomo                                             │
  ├────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ BI / requête                       │ Metabase                                           │
  ├────────────────────────────────────┼────────────────────────────────────────────────────┤
  │ Base de données directe (logiciels │ PostgreSQL / MariaDB / MongoDB → connecteur BD     │
  │  sans API)                         │ générique (feature H)                              │
  └────────────────────────────────────┴────────────────────────────────────────────────────┘

  Ma reco prioritaire : remplis un ERPNext (ou Odoo Community) — il couvre toute la production
  industrielle (BOM, OF, suivi) et se remplit comme Dolibarr → je pourrai créer un vrai jeu de
  données de production + capteurs via Home Assistant/MQTT.

  Pour OpenProject : noté, je le branche en réel (tu as les droits) au prochain tour — je crée
  un connecteur réel + collecte tes vrais projets.

  ---