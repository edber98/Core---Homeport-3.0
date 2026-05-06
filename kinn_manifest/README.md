# Kinn — déploiement Rancher / Helm

Chart Helm pour déployer Kinn (API + Homeport UI + Redis) sur un cluster Kubernetes
géré par Rancher.

```
                    ┌──────────────┐
   ingress-nginx ─▶ │ kinn-homeport│ (front Angular)
                    └──────────────┘
                    ┌──────────────┐
                ─▶  │  kinn-api    │ (Node.js + sandbox IA)
                    └──────────────┘
                           │
                           ├─▶ MongoDB (externe)
                           ├─▶ Redis (in-cluster, PVC Longhorn)
                           └─▶ Sandbox (bwrap OU subprocess+gvisor)
```

---

## 1. Prérequis cluster

- **Rancher** avec accès project-level pour créer le namespace
- **Longhorn** comme StorageClass (par défaut)
- **ingress-nginx** dans `ingress-nginx`
- **MongoDB** accessible (URL passée en `global.dependencies.mongodb.url`)

---

## 2. Choisir une stratégie de sandbox

Kinn exécute du code utilisateur (Python, Node) via le tool `execute_code`.
Deux stratégies possibles :

### Option A — `subprocess` + **gVisor** (recommandé prod)

L'isolation est portée par Kubernetes lui-même via `RuntimeClass: gvisor`.
gVisor intercepte les syscalls dans un kernel user-mode (`runsc`) → isolation
forte, pas besoin de configurer les nodes pour les userns Linux.

➜ Voir **§3 — Installation gVisor**.

### Option B — `bwrap` (bubblewrap, namespaces Linux)

L'isolation est portée par l'app : chaque exec_code spawn un sous-processus
dans son propre namespace Linux. Pas besoin de RuntimeClass spéciale.

**Prérequis nodes** :
```bash
# Sur chaque worker node Rancher
echo "kernel.unprivileged_userns_clone=1" | sudo tee /etc/sysctl.d/99-userns.conf
sudo sysctl --system

# Vérifier
sysctl kernel.unprivileged_userns_clone   # doit retourner 1
```

L'image kinn-api inclut déjà `bwrap` (paquet `bubblewrap`).

### Option C — `none` (DEV uniquement)

Aucune isolation. **Ne JAMAIS utiliser en production.**

---

## 3. Installation gVisor sur les nodes Rancher

À faire **une seule fois** sur chaque worker node du cluster.

### 3.1. Installer `runsc` + shim containerd

```bash
# Sur chaque worker (SSH ou via Rancher Node Driver)
ARCH=$(uname -m)
URL="https://storage.googleapis.com/gvisor/releases/release/latest/${ARCH}"
wget ${URL}/runsc ${URL}/containerd-shim-runsc-v1
chmod +x runsc containerd-shim-runsc-v1
sudo mv runsc containerd-shim-runsc-v1 /usr/local/bin/

# Vérifier
runsc --version
```

### 3.2. Configurer containerd

```bash
sudo /usr/local/bin/runsc install
```

Cette commande ajoute la section `runc.runsc` dans `/etc/containerd/config.toml` :

```toml
[plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runsc]
  runtime_type = "io.containerd.runsc.v1"
```

Puis redémarrer containerd :

```bash
sudo systemctl restart containerd
```

### 3.3. Créer la `RuntimeClass` côté Kubernetes

À appliquer **une seule fois** dans le cluster (pas par namespace) :

```yaml
# gvisor-runtimeclass.yaml
apiVersion: node.k8s.io/v1
kind: RuntimeClass
metadata:
  name: gvisor
handler: runsc
```

```bash
kubectl apply -f gvisor-runtimeclass.yaml
```

Ou via Rancher UI : **Cluster Explorer → More Resources → node.k8s.io →
RuntimeClass → Create**.

### 3.4. Tester un pod isolé

```bash
kubectl run test-gvisor --image=alpine --restart=Never \
  --overrides='{"spec":{"runtimeClassName":"gvisor"}}' \
  -- sh -c 'dmesg 2>&1 | head -5'
# Doit afficher "Starting gVisor..."
```

Si ça marche, tu peux activer gVisor dans la chart Kinn (§4).

---

## 4. Configuration des variables Kinn

Toutes les options sont exposées dans **questions.yaml** → visible dans Rancher
Apps → Kinn → Edit Config.

Groupes :

| Groupe | Variables |
|---|---|
| **Comptes** | email/password admin, nom entreprise, workspace par défaut |
| **LLM principal** | provider (openai/anthropic), clé API, modèle |
| **Tuning LLM** | reasoning effort, verbosity, parallel tool calls, max tokens, température |
| **Webscraping** | provider/modèle "mini" pour extraction web |
| **Sandbox & sécurité** | runtimeClassName, ai_sandbox_backend, sandbox-pkgs path |
| **Timeouts** | stream LLM, heartbeat subagent, depth max |
| **Avancé** | NODE_ENV, HMAC secret, TTL tokens |

### Recommandations par environnement

#### Prod cloud (avec gVisor installé)
```yaml
kinn.kinnApi.runtimeClassName: "gvisor"
kinn.kinnApi.ai_sandbox_backend: "subprocess"
kinn.kinnApi.node_env: "production"
kinn.kinnApi.ai_provider: "openai"
kinn.kinnApi.ai_reasoning_effort: "none"   # streaming rapide
kinn.kinnApi.ai_verbosity: "high"          # données tabulaires complètes
```

#### Prod sans gVisor (nodes avec userns activé)
```yaml
kinn.kinnApi.runtimeClassName: ""
kinn.kinnApi.ai_sandbox_backend: "bwrap"
kinn.kinnApi.node_env: "production"
```

#### Dev
```yaml
kinn.kinnApi.ai_sandbox_backend: "auto"
kinn.kinnApi.node_env: "development"
```

---

## 5. Variables d'env injectées dans le pod kinn-api

Toutes mappées depuis `values.yaml.kinn.kinnApi.*` :

| Variable | Default | Rôle |
|---|---|---|
| `AI_PROVIDER` | `openai` | Provider LLM principal |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | "" | Auth OpenAI |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | "" | Auth Anthropic |
| `AI_SANDBOX_BACKEND` | `subprocess` | bwrap \| subprocess \| none \| auto |
| `AI_SANDBOX_PYTHON` | `python3` | Binaire Python sandbox |
| `AI_SANDBOX_PY_SITE_PACKAGES` | `/data/sandbox-pkgs` | Volume packages partagé |
| `SKILLS_BUNDLE_DIR` | `/app/skills-bundle` | Skills Anthropic (xlsx, docx…) |
| `AI_REASONING_EFFORT` | `none` | OpenAI gpt-5.x reasoning |
| `AI_VERBOSITY` | `medium` | OpenAI gpt-5.x verbosity |
| `AI_PARALLEL_TOOL_CALLS` | `0` | Tool calls parallèles OpenAI (0=off) |
| `AI_MAX_TOKENS` | `16384` | Max tokens output |
| `AI_TEMPERATURE` | `0.7` | Température LLM |
| `WEB_MINI_PROVIDER`, `WEB_MINI_MODEL` | "" | LLM mini pour web extraction |
| `AI_STREAM_TIMEOUT_MS` | `240000` | Timeout stream (4 min) |
| `AI_SUBAGENT_HEARTBEAT_TIMEOUT_MS` | `180000` | Timeout heartbeat sous-agent |
| `AI_MAX_SUBAGENT_DEPTH` | `3` | Profondeur récursion sous-agents |
| `MONGO_URL`, `MONGO_DB_NAME` | depuis `global.dependencies.mongodb` | Auth Mongo |
| `HMAC_SECRET` | `dev-secret-change-me` | À CHANGER en prod |
| `TOKEN_TTL_SEC` | `86400` | TTL tokens (24h) |

---

## 6. Déploiement

### Via Rancher Apps (UI)

1. Cluster → Apps → Charts → choisir **Kinn**
2. Remplir le formulaire (questions.yaml génère l'UI)
3. Install → namespace cible (ex: `kinn-acme`)

### Via Helm CLI

```bash
helm install kinn ./kinn_manifest \
  -n kinn-acme --create-namespace \
  --set kinn.kinnApi.openai_api_key='sk-...' \
  --set kinn.kinnApi.runtimeClassName='gvisor' \
  --set kinn.kinnApi.ai_sandbox_backend='subprocess' \
  --set global.dependencies.mongodb.url='mongodb://mongo:27017'
```

Upgrade :

```bash
helm upgrade kinn ./kinn_manifest -n kinn-acme -f my-values.yaml
```

---

## 7. Troubleshooting

### Pod CrashLoopBackOff avec `bwrap: ... permission denied`
→ kernel.unprivileged_userns_clone=0 sur le node. Voir §2 option B.

### `runtimeClassName: gvisor` ignoré (pod tourne avec runc)
- Vérifier la RuntimeClass : `kubectl get runtimeclass`
- Vérifier containerd : `cat /etc/containerd/config.toml | grep runsc`
- Vérifier `runsc` installé : `which runsc`

### `execute_code` échoue avec gVisor (sandbox initialization failed)
→ Avec gVisor, **utiliser `AI_SANDBOX_BACKEND=subprocess`** (pas bwrap). Le bwrap
nécessite des syscalls que gVisor restreint.

### Pod réseau bloqué (ingress 502)
- Vérifier le service : `kubectl get svc -n <ns>`
- Vérifier la NetworkPolicy : `kubectl describe netpol -n <ns>`
- Vérifier que `kinn.ingress.host` correspond à un DNS qui pointe sur l'ingress
