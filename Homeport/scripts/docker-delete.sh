#!/bin/bash

# Fonction pour trouver et supprimer un conteneur Docker par son nom
delete_container() {
  container_name=$1
  echo "Recherche du conteneur nommé : $container_name"
  container_id=$(docker ps -a --filter "name=$container_name" --format "{{.ID}}")

  if [ -z "$container_id" ]; then
    echo "Aucun conteneur trouvé avec le nom : $container_name"
  else
    echo "Conteneur trouvé : ID = $container_id"
    echo "Suppression du conteneur..."
    docker rm -f $container_id
    echo "Conteneur supprimé avec succès."
  fi
}

# Fonction pour trouver et supprimer une image Docker par son nom
delete_image() {
  image_name=$1
  echo "Recherche de l'image nommée : $image_name"
  image_id=$(docker images --filter "reference=$image_name" --format "{{.ID}}")

  if [ -z "$image_id" ]; then
    echo "Aucune image trouvée avec le nom : $image_name"
  else
    echo "Image trouvée : ID = $image_id"
    echo "Suppression de l'image..."
    docker rmi -f $image_id
    echo "Image supprimée avec succès."
  fi
}

# Vérification des arguments
if [ "$#" -lt 2 ]; then
  echo "Utilisation : $0 <container-name> <image-name>"
  exit 1
fi

# Appel des fonctions
delete_container $1
delete_image $2
