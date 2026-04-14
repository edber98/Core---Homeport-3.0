{{/*
Nom complet basé sur release
*/}}
{{- define "homeport-api.fullname" -}}
{{- printf "%s-%s" .Release.Name .Chart.Name | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{- define "homeport-api.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
Labels communs à toutes les ressources
*/}}
{{- define "homeport-api.labels" -}}
app.kubernetes.io/name: {{ include "homeport-api.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: homeport
{{- end -}}

{{/*
Nom du secret à utiliser (existing ou créé par le chart)
*/}}
{{- define "homeport-api.secretName" -}}
{{- if .Values.secrets.existingSecret -}}
{{ .Values.secrets.existingSecret }}
{{- else -}}
homeport-secrets
{{- end -}}
{{- end -}}

{{/*
Env IA commun (API + worker)
*/}}
{{- define "homeport-api.aiEnv" -}}
{{- range $k, $v := .Values.aiEnv }}
- name: {{ $k }}
  value: {{ $v | quote }}
{{- end }}
- name: REDIS_HOST
  value: "{{ .Release.Name }}-redis"
- name: REDIS_PORT
  value: "6379"
{{- end -}}
