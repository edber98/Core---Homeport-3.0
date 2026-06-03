# Audit couverture automation - deepseek, discord, docker, docusign, dropbox, dropcontact
Date: 2026-06-01
Mode: NOEUDS DEDIES UNIQUEMENT (non custom)

## Perimetre retenu
- Inclus: endpoints metier utiles en automation (CRUD, list/search, transitions d etat, actions unitaires frequentes).
- Exclus: configuration globale, OAuth/setup credentials, administration compte/workspace, billing/permissions globales.

## Coverage metier
- deepseek: 4/4 (100%)
- discord bot: 30/30 (100%)
- docker: 37/37 (100%)
- docusign: 18/18 (100%)
- dropbox: 21/21 (100%)
- dropcontact: 3/3 (100%)
- Global: 113/113 (100%)

## Endpoints/noeuds ajoutes (dedies)
- deepseek: `deepseek_embeddings_create`
- discord: `discord_remove_role_from_member`, `discord_create_dm`, `discord_bulk_delete_messages`, `discord_pin_message`, `discord_unpin_message`, `discord_get_guild_member`, `discord_modify_guild_member`
- docker: `docker_container_pause`, `docker_container_unpause`, `docker_container_wait`, `docker_container_rename`, `docker_container_stats`, `docker_image_inspect`, `docker_image_tag`, `docker_network_inspect`, `docker_volume_inspect`, `docker_containers_prune`, `docker_images_prune`, `docker_networks_prune`, `docker_volumes_prune`, `docker_system_df`
- docusign: `docusign_envelope_update`, `docusign_envelope_audit_events_list`, `docusign_envelope_lock`, `docusign_envelope_unlock`
- dropbox: `dbx_list_folder_continue`, `dbx_get_temporary_link`, `dbx_download_zip`, `dbx_save_url`, `dbx_save_url_check_job_status`
- dropcontact: aucun ajout (couverture metier deja complete sur l API exposee dans ce connecteur)

## Exclusions appliquees
- Endpoints de configuration/parametrage/admin global explicitement exclus pour les 6 connecteurs.
- Aucun noeud `custom_request` conserve.

## Validation
- Parse manifest JSON: OK (6/6)
- Chargement handlers ajoutes: OK
- Verification anti-custom: `custom_request` absent des manifests et handlers

## Gap residuel
- 0 sur le perimetre metier retenu.
