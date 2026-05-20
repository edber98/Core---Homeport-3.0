
module.exports = {
  async tg_webhook_event(node, msg, inputs, opts) {
      const log = (opts && opts.log) ? opts.log : () => {};
      const data = (msg && msg.payload) || msg || {};
      log(`[tg_webhook_event] raw payload keys=[${Object.keys(data).join(',')}]`);
  
      const message = data.message || data.edited_message || {};
      const callback = data.callback_query || {};
  
      // Detect file attachment
      let file_type = "";
      let file_id = "";
      let file_name = "";
      let file_mime = "";
      let file_size = 0;
      let file = null;
  
      if (message.document) {
        file_type = "document";
        file_id = message.document.file_id;
        file_name = message.document.file_name || "document";
        file_mime = message.document.mime_type || "application/octet-stream";
        file_size = message.document.file_size || 0;
      } else if (message.photo && message.photo.length > 0) {
        file_type = "photo";
        // Take the largest resolution (last in array)
        const best = message.photo[message.photo.length - 1];
        file_id = best.file_id;
        file_name = "photo.jpg";
        file_mime = "image/jpeg";
        file_size = best.file_size || 0;
      } else if (message.video) {
        file_type = "video";
        file_id = message.video.file_id;
        file_name = message.video.file_name || "video.mp4";
        file_mime = message.video.mime_type || "video/mp4";
        file_size = message.video.file_size || 0;
      } else if (message.audio) {
        file_type = "audio";
        file_id = message.audio.file_id;
        file_name = message.audio.file_name || "audio.mp3";
        file_mime = message.audio.mime_type || "audio/mpeg";
        file_size = message.audio.file_size || 0;
      } else if (message.voice) {
        file_type = "voice";
        file_id = message.voice.file_id;
        file_name = "voice.ogg";
        file_mime = message.voice.mime_type || "audio/ogg";
        file_size = message.voice.file_size || 0;
      } else if (message.sticker) {
        file_type = "sticker";
        file_id = message.sticker.file_id;
        file_name = "sticker.webp";
        file_mime = "image/webp";
        file_size = message.sticker.file_size || 0;
      }
  
      // Download file if present and we have credentials + file storage
      if (file_id && opts.credentials && opts.files) {
        const botToken = opts.credentials.botToken || opts.credentials.bot_token || opts.credentials.token;
        if (botToken) {
          try {
            log(`[tg_webhook_event] downloading ${file_type}: ${file_name} (${file_id})`);
            // Get file path from Telegram
            const fileRes = await fetch(`https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(file_id)}`);
            const fileData = await fileRes.json();
            if (fileData.ok && fileData.result?.file_path) {
              // Download the file
              const dlRes = await fetch(`https://api.telegram.org/file/bot${botToken}/${fileData.result.file_path}`);
              const buf = Buffer.from(await dlRes.arrayBuffer());
              // Store as fileRef
              file = await opts.files.store(buf, { name: file_name, mimeType: file_mime });
              log(`[tg_webhook_event] file stored: ${file_name} (${buf.length} bytes)`);
            }
          } catch (e) {
            log(`[tg_webhook_event] file download failed: ${e.message}`);
          }
        }
      }
  
      const result = {
        ok: true,
        update_id: data.update_id || "",
        message_text: message.text || message.caption || callback.data || "",
        message_chat_id: String(message.chat?.id || callback.message?.chat?.id || ""),
        message_from_id: String(message.from?.id || callback.from?.id || ""),
        message_from_name: message.from?.first_name || callback.from?.first_name || "",
        message_from_username: message.from?.username || callback.from?.username || "",
        callback_data: callback.data || "",
        file_type,
        file_name,
        file,
      };
  
      log(`[tg_webhook_event] extracted: chat=${result.message_chat_id} from=${result.message_from_id} text="${(result.message_text || '').slice(0, 80)}" file_type=${file_type}`);
      return result;
    }
};
