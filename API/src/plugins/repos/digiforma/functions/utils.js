/**
 * Digiforma GraphQL API utility functions
 * Uses Bearer token authentication
 */

/**
 * Generic Digiforma GraphQL call
 * @param {string} query - GraphQL query or mutation
 * @param {object} variables - GraphQL variables
 * @param {object} credentials - { token }
 * @returns {Promise<{ok: boolean, data?: any, error?: string}>}
 */
async function digiformaGql(query, variables, credentials) {
  const { token } = credentials || {};
  if (!token) throw new Error('Digiforma credentials required (token)');

  const res = await fetch('https://app.digiforma.com/api/v1/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables: variables || {} }),
  });

  let body;
  try {
    body = await res.json();
  } catch {
    const text = await res.text().catch(() => `HTTP ${res.status}`);
    return { ok: false, error: `Digiforma API error ${res.status}: ${text}` };
  }

  if (!res.ok) {
    const errMsg = body.message || body.error || JSON.stringify(body);
    return { ok: false, error: `Digiforma API error ${res.status}: ${errMsg}` };
  }

  if (body.errors && body.errors.length > 0) {
    const msg = body.errors.map(e => e.message).join('; ');
    return { ok: false, error: `GraphQL error: ${msg}` };
  }

  return { ok: true, data: body.data };
}

module.exports = { digiformaGql };
