import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
} from 'baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

let sock: ReturnType<typeof makeWASocket>;

async function connectToWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('wa-session');

  sock = makeWASocket({
    auth: state,
    logger: P({ level: 'error' }),
  });

  sock.ev.on('connection.update', async (update: Partial<ConnectionState>) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(await QRCode.toString(qr, { type: 'terminal' }));
    }

    if (connection === 'close') {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;

      if (statusCode === DisconnectReason.restartRequired) {
        console.log('Restart required, reconnecting...');
        sock.end(undefined);
        connectToWhatsApp();
      }

      if (statusCode === DisconnectReason.loggedOut) {
        console.log('Logged out. Scan QR again.');
      }
    }

    if (connection === 'open') {
      console.log('WhatsApp connected ✅');
    }
  });

  sock.ev.on('messages.upsert', async (event) => {
    for (const m of event.messages) {
      const jid: string = m.key.remoteJid ?? '';
      if (!jid) continue;

      const username: string = m.pushName ?? '';

      const imageMessage = m.message?.imageMessage;
      const videoMessage = m.message?.videoMessage;

      const message: string =
        m.message?.conversation ??
        m.message?.extendedTextMessage?.text ??
        imageMessage?.caption ??
        videoMessage?.caption ??
        '';

      const quoted = m.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (message !== '' && username !== '') {
        // lógica de los mensajes -------------------------------------------------------
        console.log(`${username} dice: ${message}`);

        // COMANDO MENU
        if (message === '#menu') {
          const uptime = process.uptime();
          const horas = Math.floor(uptime / 3600);
          const minutos = Math.floor((uptime % 3600) / 60);
          const segundos = Math.floor(uptime % 60);

          const textMenu: string = `
╔I [ \`\`\`NEXOBOT\`\`\` ]
║❂ Tiempo activo: ${horas}H ${minutos}M ${segundos}S
║❂ Version del bot: 1.0.0
║❂ Dueño del bot: Nullpathy
║❂ Prefijo único: 「  #  」
║❂ Cliente: ${username}
╚══════════
‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎
~|-------------------------|~
*[_>] _COMANDOS_ ☷*
~|-------------------------|~

╔「 _CONVERSORES :_ 」
║╭—————————
║├  #sticker | #s
║╰—————————
╚══════════
╔「 _HERRAMIENTAS :_ 」
║╭—————————
║├  #ping
║├  #menu
║╰—————————
╚══════════
          `.trim();
          await sock.sendMessage(
            jid,
            {
              text: textMenu,
              mentions: [m.key.participant || m.key.remoteJid || ''],
            },
            { quoted: m },
          );
        }

        // COMANDO PING
        if (message === '#ping') {
          const timestamp = m.messageTimestamp ? Number(m.messageTimestamp) : 0;
          const latency = Date.now() - timestamp * 1000;

          await sock.sendMessage(
            jid,
            { text: `Pong! 🏓\nLatencia: ${latency}ms` },
            { quoted: m },
          );
        }

        // COMANDO STICKER
        if (message === '#s' || message === '#sticker') {
          if (!quoted && !imageMessage && !videoMessage) {
            await sock.sendMessage(
              jid,
              { text: 'Responde a una imagen o video (≤ 7s)' },
              { quoted: m },
            );
            continue;
          }

          const isImage = !!quoted?.imageMessage || !!imageMessage;
          const isVideo =
            (!!quoted?.videoMessage &&
              (quoted.videoMessage.seconds ?? 0) <= 7) ||
            (!!videoMessage && (videoMessage.seconds ?? 0) <= 7);

          if (!isImage && !isVideo) {
            await sock.sendMessage(
              jid,
              { text: 'Solo imágenes o videos menores a 7 segundos' },
              { quoted: m },
            );
            continue;
          }

          const mediaMessage = quoted ?? m.message;
          const mediaKey = quoted
            ? {
                remoteJid: m.key.remoteJid!,
                id: m.message?.extendedTextMessage?.contextInfo?.stanzaId!,
                participant:
                  m.message?.extendedTextMessage?.contextInfo?.participant!,
              }
            : m.key;

          try {
            const buffer = await downloadMediaMessage(
              {
                key: mediaKey,
                message: mediaMessage!,
              },
              'buffer',
              {},
            );

            const quality = isVideo ? 10 : 50;

            const sticker = new Sticker(buffer, {
              pack: 'NexoBot',
              author: 'Nullpathy',
              type: StickerTypes.FULL,
              quality: quality,
            });

            const stickerBuffer = await sticker.toBuffer();

            if (stickerBuffer.length > 1000000) {
              console.log('Error: El sticker pesa más de 1MB');
              await sock.sendMessage(
                jid,
                {
                  text: '❌ El video es muy pesado para ser sticker (Max 1MB). Intenta recortarlo.',
                },
                { quoted: m },
              );
              continue;
            }

            await sock.sendMessage(
              jid,
              {
                sticker: stickerBuffer,
                isAnimated: isVideo,
                mimetype: 'image/webp',
              },
              {
                quoted: m,
              },
            );
          } catch (error) {
            console.error('Error al generar sticker:', error);
            await sock.sendMessage(
              jid,
              { text: 'Ocurrió un error al procesar el sticker.' },
              { quoted: m },
            );
          }
        }
        // ------------------------------------------------------------------------------
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
