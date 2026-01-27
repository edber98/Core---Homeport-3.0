export const environment = {
  production: true,
  // Remplacer par l’URL de prod lors du déploiement
  apiBaseUrl: 'https://app.kinn.fr',
  // En production, on ignore apiBaseUrl au profit de location.origin + pathSuffix
  pathSuffix: '/api',
  apiDocsUrl: 'https://app.kinn.fr/api-docs',
  useBackend: true,
};
