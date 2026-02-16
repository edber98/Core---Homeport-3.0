const TelegramBot = require('node-telegram-bot-api');
const { SubscriptionTrigger } = require('../subscription-trigger');

class TelegramAdapter extends SubscriptionTrigger {
  async _connect() {
    const token = this.credentials.botToken || this.credentials.bot_token || this.credentials.token;
    if (!token) throw new Error('Missing Telegram botToken');

    // Create bot WITHOUT auto-polling to control startup
    this.bot = new TelegramBot(token, { polling: false });

    // Verify token is valid before starting polling
    try {
      const me = await this.bot.getMe();
      this.log.info(`[telegram] bot verified: @${me.username} (${me.id})`);
    } catch (e) {
      this.bot = null;
      throw new Error(`Telegram bot token invalid or network error: ${e.message}`);
    }

    // Now start polling
    this.bot.startPolling();

    this.bot.on('message', (msg) => {
      this.log.info(`[telegram] message received: chat=${msg.chat?.id} from=${msg.from?.id} text="${(msg.text || '').slice(0, 80)}"`);
      this._emit({ message: msg });
    });
    this.bot.on('callback_query', (query) => {
      this.log.info(`[telegram] callback_query received: from=${query.from?.id} data="${query.data || ''}"`);
      this._emit({ callback_query: query });
    });
    this.bot.on('polling_error', (err) => {
      this.lastError = err.message;
      this.log.error(`[telegram] polling error: ${err.message}`);
    });

    this.log.info(`[telegram] bot started polling (${token.slice(0, 8)}...)`);
  }

  async _disconnect() {
    if (this.bot) {
      try { await this.bot.stopPolling(); } catch {}
      this.bot.removeAllListeners();
      this.bot = null;
    }
    this.log.info('[telegram] bot stopped');
  }
}

module.exports = { TelegramAdapter };
