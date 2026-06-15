module.exports = {
  // Lit les derniers messages d'une boîte IMAP (enveloppes, du plus récent au
  // plus ancien). Credentials : imapHost/imapPort/imapSecure/username/password
  // (fallbacks host/port/user/pass, mêmes conventions que l'adapter trigger).
  // Args : mailbox (INBOX), search (filtre sujet/expéditeur), limit (20, max 200).
  async email_read(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    const creds = (opts && opts.credentials) || {};
    const host = creds.imapHost || creds.host;
    const port = parseInt(creds.imapPort || creds.port, 10) || 993;
    const secure = creds.imapSecure !== false && creds.imapSecure !== 'false' && creds.imapSecure !== 0;
    const user = creds.username || creds.user || '';
    const pass = creds.password || creds.pass || '';
    if (!host || !user || !pass) return { ok: false, error: 'missing_imap_credentials (imapHost / username / password requis)' };

    const d = inputs || {};
    const limit = Math.max(1, Math.min(parseInt(d.limit, 10) || 20, 200));
    const mailbox = d.mailbox || 'INBOX';

    const { ImapFlow } = require('imapflow');
    const client = new ImapFlow({
      host, port, secure,
      auth: { user, pass },
      logger: false,
      tls: { rejectUnauthorized: false },
      connectionTimeout: 15000,
    });
    // Capter les erreurs socket asynchrones AVANT connect() (sinon crash process)
    client.on('error', (err) => { try { log(`[imap] socket error: ${err.message}`); } catch {} });

    const includeBody = d.includeBody !== false && d.includeBody !== 'false';

    try {
      await client.connect();
      const box = await client.mailboxOpen(mailbox, { readOnly: true });
      const total = box.exists || 0;

      // Sélection : recherche IMAP côté serveur. Syntaxes acceptées :
      //   UNSEEN | SEEN | ALL | UID 299 | FROM "x" | TO "x" | SUBJECT "x" |
      //   BODY "x" | texte libre (cherché dans sujet + expéditeur).
      let range = null;
      let byUid = false;
      const rawSearch = String(d.search || '').trim();
      if (rawSearch && rawSearch.toUpperCase() !== 'ALL') {
        const up = rawSearch.toUpperCase();
        const kw = rawSearch.match(/^(FROM|TO|SUBJECT|BODY|UID)\s+"?([^"]+)"?$/i);
        let criteria;
        if (up === 'UNSEEN') criteria = { seen: false };
        else if (up === 'SEEN') criteria = { seen: true };
        else if (kw) {
          const key = kw[1].toLowerCase();
          const val = kw[2].trim();
          if (key === 'uid') criteria = { uid: val };
          else criteria = { [key]: val };
        } else criteria = { or: [{ subject: rawSearch }, { from: rawSearch }] };
        const uids = await client.search(criteria, { uid: true });
        const lastUids = (uids || []).slice(-limit);
        if (!lastUids.length) return { ok: true, totalCount: 0, mailbox, messages: [] };
        range = lastUids;
        byUid = true;
      } else if (total > 0) {
        range = `${Math.max(1, total - limit + 1)}:${total}`;
      }

      const messages = [];
      if (range) {
        const fetchQuery = { envelope: true, uid: true, flags: true, internalDate: true };
        // Corps : source brute plafonnée à 128 Ko / message (gros mails et PJ tronqués)
        if (includeBody) fetchQuery.source = { maxLength: 131072 };
        const fmt = (arr) => (arr || []).map(a => a.address ? (a.name ? `${a.name} <${a.address}>` : a.address) : (a.name || '')).filter(Boolean).join(', ');
        for await (const m of client.fetch(range, fetchQuery, { uid: byUid })) {
          const env = m.envelope || {};
          let text = '';
          if (includeBody && m.source) {
            try {
              const { simpleParser } = require('mailparser');
              const parsed = await simpleParser(m.source);
              text = String(parsed.text || parsed.html || '').replace(/<[^>]+>/g, ' ').replace(/\s{3,}/g, '\n').trim().slice(0, 5000);
            } catch { /* source tronquée illisible → texte vide */ }
          }
          messages.push({
            id: String(m.uid),
            messageId: env.messageId || String(m.uid),
            subject: env.subject || '',
            from: fmt(env.from),
            to: fmt(env.to),
            date: (env.date || m.internalDate || '').toString(),
            seen: m.flags ? m.flags.has('\\Seen') : false,
            text,
            mailbox,
          });
        }
        messages.reverse(); // plus récent en premier
      }
      log(`[imap] ${messages.length} message(s) lus dans ${mailbox} (${host})${rawSearch ? ` [search: ${rawSearch}]` : ''}`);
      return { ok: true, totalCount: messages.length, mailbox, messages };
    } catch (e) {
      return { ok: false, error: `imap_read_failed (${host}:${port}): ${e.message}` };
    } finally {
      try { await client.logout(); } catch { try { client.close(); } catch {} }
    }
  },
  async email_new_message(node, msg, inputs, opts) {
    const log = (opts && opts.log) ? opts.log : () => {};
    // Parse raw email payload from trigger
    const data = (msg && msg.payload) || {};
    return {
      ok: true,
      from: data.from || '',
      to: data.to || '',
      subject: data.subject || '',
      text: data.text || '',
      html: data.html || '',
      date: data.date || '',
      messageId: data.messageId || '',
      attachmentCount: data.attachmentCount || 0,
      // Tableau de fileRef ({_type, fileId, name, mimeType, size}) — chaque
      // pièce jointe est déjà stockée dans FileRecord par l'adapter IMAP.
      // Connecte-le à un node loop pour itérer + uploader/transformer.
      attachments: Array.isArray(data.attachments) ? data.attachments : [],
    };
  }
};
