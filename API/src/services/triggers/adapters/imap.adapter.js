const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { SubscriptionTrigger } = require('../subscription-trigger');
const { createFilesHelper } = require('../../file-storage');

class ImapAdapter extends SubscriptionTrigger {
  async _connect() {
    const { imapHost, imapPort, imapSecure, username, password, host, port: rawPort, user, pass } = this.credentials;
    const finalHost = imapHost || host || 'imap.gmail.com';
    const finalPort = parseInt(imapPort || rawPort, 10) || 993;
    const finalSecure = imapSecure !== false && imapSecure !== 'false' && imapSecure !== 0;
    const finalUser = username || user || '';
    const finalPass = password || pass || '';

    if (!finalUser || !finalPass) throw new Error('Missing IMAP username or password');

    this.log.info(`[imap] connecting to ${finalHost}:${finalPort} (secure=${finalSecure}, user=${finalUser.slice(0,4)}...)`);

    this.client = new ImapFlow({
      host: finalHost,
      port: finalPort,
      secure: finalSecure,
      auth: { user: finalUser, pass: finalPass },
      logger: false,
      tls: { rejectUnauthorized: false },
      // Timeouts to avoid hanging forever
      connectionTimeout: 15000,
    });

    // CRITICAL: catch async 'error' events BEFORE connect() to prevent process crash
    this.client.on('error', (err) => {
      this.lastError = err.message;
      this.log.error(`[imap] socket error: ${err.message}`);
      // If active, try to reconnect
      if (this.active) {
        this.log.warn('[imap] error during active connection, reconnecting in 10s...');
        setTimeout(() => this._reconnect(), 10000);
      }
    });

    try {
      await this.client.connect();
    } catch (e) {
      this.client.removeAllListeners();
      this.client = null;
      throw new Error(`IMAP connection failed (${finalHost}:${finalPort}): ${e.message}`);
    }

    const mailbox = this.eventNode?.model?.context?.mailbox
      || this.eventNode?.data?.model?.context?.mailbox
      || 'INBOX';
    await this.client.mailboxOpen(mailbox);

    this.client.on('exists', async () => {
      try {
        const msg = await this.client.fetchOne(
          this.client.mailbox.exists,
          { envelope: true, source: true }
        );
        if (msg?.source) {
          const parsed = await simpleParser(msg.source);
          // Stocke les pièces jointes en FileRecord et expose un tableau
          // de fileRef au flow → utilisable directement avec un node loop +
          // file uploader (Nextcloud, Dropbox, S3…). Sans ça, seul le count
          // était disponible, les fichiers eux-mêmes étaient perdus.
          const attachments = [];
          const rawAttachments = parsed.attachments || [];
          if (rawAttachments.length > 0) {
            try {
              const filesHelper = createFilesHelper({
                workspaceId: this.flow?.workspaceId,
                companyId: this.flow?.companyId,
                runId: null, // pas de runId à ce stade : le run sera créé après le trigger
              });
              for (const att of rawAttachments) {
                try {
                  const ref = await filesHelper.store(att.content, {
                    name: att.filename || 'attachment',
                    mimeType: att.contentType || 'application/octet-stream',
                    lifecycle: 'temp', // expire automatiquement (cf. FILE_TTL_DEFAULT)
                  });
                  attachments.push({
                    filename: att.filename || ref.name,
                    mimeType: ref.mimeType,
                    size: ref.size,
                    fileId: ref.fileId,
                    _type: 'fileRef',
                  });
                } catch (storeErr) {
                  this.log.warn(`[imap] attachment store failed (${att.filename}): ${storeErr.message}`);
                }
              }
            } catch (helperErr) {
              this.log.warn(`[imap] filesHelper init failed: ${helperErr.message}`);
            }
          }
          await this._emit({
            from: parsed.from?.text || '',
            to: parsed.to?.text || '',
            subject: parsed.subject || '',
            text: parsed.text || '',
            html: parsed.html || '',
            date: parsed.date?.toISOString() || '',
            messageId: parsed.messageId || '',
            attachmentCount: rawAttachments.length,
            attachments,
          });
        }
      } catch (e) {
        this.lastError = e.message;
      }
    });

    this.client.on('close', () => {
      if (this.active) {
        this.log.warn('[imap] connection lost, reconnecting in 5s...');
        setTimeout(() => this._reconnect(), 5000);
      }
    });

    this.log.info(`[imap] connected to ${finalHost}:${finalPort} (${mailbox})`);
  }

  async _reconnect() {
    if (!this.active) return;
    try { await this._disconnect(); } catch {}
    try {
      await this._connect();
    } catch (e) {
      this.lastError = e.message;
      this.log.error(`[imap] reconnect failed: ${e.message}, retry in 30s`);
      setTimeout(() => this._reconnect(), 30000);
    }
  }

  async _disconnect() {
    if (this.client) {
      try { await this.client.logout(); } catch {}
      try { this.client.removeAllListeners(); } catch {}
      this.client = null;
    }
  }
}

module.exports = { ImapAdapter };
