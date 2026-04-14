# Déploiement Homeport API v2 sur Kubernetes (Rancher + Longhorn)

Ce dossier contient les manifests Kubernetes pour déployer l'API Homeport v2
sur un cluster Rancher utilisant Longhorn comme storage provider.

Deux approches sont fournies :
- **Kustomize** (`k8s/base/` + `k8s/overlays/`) — recommandé, léger
- **Helm** (`helm/homeport-api/`) — alternatif, plus paramétrable

## Architecture

```
                   ┌──────────────────┐
  ingress-nginx ─▶ │ homeport-api (N) │ ─┐
                   └──────────────────┘  │
                                         ├─▶ MongoDB (externe)
                                         │
                   ┌──────────────────┐  │
                   │ ai-worker    (N) │ ─┤
                   └──────────────────┘  │
                           │             │
                           ▼             │
                   ┌──────────────────┐  │
                   │     redis        │ ◀┘
                   └──────────────────┘
                           │
                 ┌─────────┴─────────┐
                 │ PVC RWX Longhorn  │  ← cache bubblewrap partagé
                 │ /agent-cache      │
                 └───────────────────┘
```

## Pré-requis cluster

- **Rancher** avec accès RBAC project-level pour créer le namespace client
- **Longhorn** installé avec StorageClass `longhorn` par défaut
- **ingress-nginx** dans le namespace `ingress-nginx` (ou adapter les NetworkPolicy)
- Nodes avec kernel >= 5.10 et `kernel.unprivileged_userns_clone=1` (bubblewrap)

### Vérifier les nodes

```bash
# Tous les nodes doivent retourner 1
kubectl get nodes -o name | xargs -I{} kubectl debug {} --image=busybox -it --quiet -- sysctl kernel.unprivileged_userns_clone

# Ou plus simplement via DaemonSet préparé
kubectl apply -f https://raw.githubusercontent.com/...check-userns.yaml
```

Si `0`, configurer sur chaque node (ou via Rancher Node Template) :
```bash
echo "kernel.unprivileged_userns_clone=1" | sudo tee /etc/sysctl.d/99-userns.conf
sudo sysctl --system
```

La `RuntimeClass` par défaut (runc) suffit — pas besoin de gVisor ni Kata.

## Namespace multi-tenant

Convention : un namespace par client, préfixé `homeport-<client>`.

Rancher crée le namespace. Exemple :
```bash
kubectl create namespace homeport-acme \
  --labels=app.kubernetes.io/part-of=homeport,tier=application
```

## Déploiement avec Kustomize

### Prod
```bash
kubectl apply -k k8s/overlays/prod/ -n homeport-acme
```

### Dev
```bash
kubectl apply -k k8s/overlays/dev/ -n homeport-dev
```

### Override d'image par la CI
```bash
cd k8s/overlays/prod && kustomize edit set image \
  registry.example.com/homeport-api=registry.example.com/homeport-api:${GIT_SHA}
kubectl apply -k .
```

## Déploiement avec Helm

```bash
helm install homeport ./helm/homeport-api \
  -n homeport-acme --create-namespace \
  -f values-prod.yaml \
  --set image.tag=${GIT_SHA} \
  --set secrets.existingSecret=homeport-secrets
```

Upgrade :
```bash
helm upgrade homeport ./helm/homeport-api -n homeport-acme -f values-prod.yaml
```

## Gestion des secrets

**Ne jamais committer** de secrets en clair. Trois options :

### 1. Rancher Secret Manager (UI)
Rancher → Project → Resources → Secrets → Create `homeport-secrets`
Ajouter les clés : `MONGODB_URI`, `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
`JWT_SECRET`, `SESSION_SECRET`.

### 2. kubectl (dev)
```bash
kubectl create secret generic homeport-secrets \
  --from-literal=MONGODB_URI='mongodb://user:pass@mongo:27017/homeport' \
  --from-literal=ANTHROPIC_API_KEY='sk-ant-xxx' \
  --from-literal=OPENAI_API_KEY='sk-xxx' \
  --from-literal=JWT_SECRET="$(openssl rand -hex 32)" \
  --from-literal=SESSION_SECRET="$(openssl rand -hex 32)" \
  -n homeport-acme
```

### 3. sealed-secrets / external-secrets (prod recommandé)
Voir https://sealed-secrets.netlify.app/ pour chiffrer dans le repo Git.

## Scaling

```bash
# API (si pic de trafic HTTP)
kubectl scale deploy/homeport-api --replicas=5 -n homeport-acme

# Workers IA (si pic de jobs IA longs)
kubectl scale deploy/homeport-ai-worker --replicas=10 -n homeport-acme
```

HPA possible sur CPU (ex. sur l'API) :
```bash
kubectl autoscale deploy/homeport-api --cpu-percent=70 --min=2 --max=10 -n homeport-acme
```

## Monitoring & logs

- Logs applicatifs en JSON (`LOG_FORMAT=json`) — ingérés par Loki/Kibana
- Endpoint `/api/health` pour liveness/readiness
- Exporter Prometheus à brancher via `ServiceMonitor` si Prometheus-Operator déployé
  (non inclus ici — dépend de la stack observabilité du cluster)

## Sauvegarde

- **MongoDB** : externe, sauvegarde gérée hors-cluster
- **Redis** : AOF activé (`--appendonly yes`). PVC Longhorn snapshotté via CronJob
- **Cache agent** (`/var/lib/homeport/agent-cache`) : reconstructible, pas critique

## Troubleshooting

### bubblewrap échoue au démarrage
- Vérifier `kernel.unprivileged_userns_clone=1` sur les nodes
- Vérifier que le pod tourne bien avec `runAsUser: 1000` (pas root)
- Regarder les logs : `kubectl logs deploy/homeport-api | grep -i sandbox`

### PVC reste en Pending
- Vérifier `kubectl get storageclass longhorn` existe et est default
- Vérifier `kubectl -n longhorn-system get pods` tous Running
- RWX requiert que tous les nodes aient longhorn CSI installé

### Redis connection refused
- Vérifier le service : `kubectl get svc redis -n homeport-acme`
- Vérifier NetworkPolicy : `kubectl describe netpol -n homeport-acme`

## Structure des fichiers

```
k8s/
├── base/                          # Manifests génériques (Kustomize base)
│   ├── namespace.yaml             # Template namespace (commenté)
│   ├── configmap-env.yaml
│   ├── secret-template.yaml
│   ├── pvc-agent-cache.yaml       # RWX Longhorn 50Gi
│   ├── pvc-redis.yaml             # RWO Longhorn 5Gi
│   ├── deployment-redis.yaml
│   ├── service-redis.yaml
│   ├── deployment-api.yaml        # API principale
│   ├── deployment-ai-worker.yaml  # Worker jobs IA
│   ├── service-api.yaml
│   ├── networkpolicy-api.yaml     # Isolation réseau
│   └── kustomization.yaml
├── overlays/
│   ├── prod/                      # Production (3 replicas, resources+)
│   └── dev/                       # Développement (1 replica, debug logs)
└── README.md (ce fichier)

helm/homeport-api/
├── Chart.yaml
├── values.yaml
└── templates/                     # Mêmes ressources, templatisées
```
