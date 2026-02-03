import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  downloadContentFromMessage,
} from 'baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

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

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        'Conexión cerrada debido a:',
        error?.message || error,
        ', reconectando:',
        shouldReconnect,
      );

      if (shouldReconnect) {
        connectToWhatsApp();
      } else {
        console.log(
          'Sesión cerrada. Eliminando credenciales y generando nuevo QR...',
        );
        try {
          fs.rmSync('wa-session', { recursive: true, force: true });
          console.log('Carpetas de sesión eliminadas.');
          connectToWhatsApp();
        } catch (err) {
          console.error('No se pudo eliminar la carpeta de sesión:', err);
        }
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

      const username: string = m.pushName ?? 'Usuario';

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
        if (message === '#menu' || message === '#help') {
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
‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎‎
~|-------------------------|~
*[_>] _COMANDOS_ ☷*
~|-------------------------|~

╔「 _STICKERS :_ 」
║╭—————————
║├  #sticker | #s {citar una imagen/video}
║╰—————————
╚══════════
╔「 _DESCARGAS :_ 」
║╭—————————
║├  #mp4 | #ytmp4 [link youtube]
║├  #mp3 | #play [link youtube]
║╰—————————
╚══════════
╔「 _UTILIDADES :_ 」
║╭—————————
║├  #del | #delete {citar un mensaje}
║├  #pfp [@usuario]
║├  #menu | #help
║├  #ping | #p
║├  #toimage | #toimg {citar sticker}
║├  #say [mensaje]
║╰—————————
╚══════════
╔「 _ADMINISTRACIÓN :_ 」
║╭—————————
║├  #bot [on/off]
║├  #kick <@usuario> | {mencion}
║├  #tag [mensaje]
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

        if (message === '#ping' || message === '#p') {
          const timestamp = m.messageTimestamp ? Number(m.messageTimestamp) : 0;
          const latency = Date.now() - timestamp * 1000;

          await sock.sendMessage(
            jid,
            { text: `Pong! 🏓\nLatencia: ${latency}ms` },
            { quoted: m },
          );
        }

        if (message === '#s' || message === '#sticker') {
          const isSticker = !!quoted?.stickerMessage;

          if (!quoted && !imageMessage && !videoMessage && !isSticker) {
            await sock.sendMessage(
              jid,
              { text: 'Responde a una imagen, video (≤ 7s) o sticker' },
              { quoted: m },
            );
            continue;
          }

          const isImage = !!quoted?.imageMessage || !!imageMessage;
          const isVideo =
            (!!quoted?.videoMessage &&
              (quoted.videoMessage.seconds ?? 0) <= 7) ||
            (!!videoMessage && (videoMessage.seconds ?? 0) <= 7);

          if (!isImage && !isVideo && !isSticker) {
            await sock.sendMessage(
              jid,
              { text: 'Solo imágenes, stickers o videos menores a 7 segundos' },
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
              author: username,
              type: StickerTypes.FULL,
              quality: quality,
            });

            const stickerBuffer = await sticker.toBuffer();

            if (stickerBuffer.length > 1000000) {
              console.log('Error: El sticker pesa más de 1MB');
              await sock.sendMessage(
                jid,
                {
                  text: 'El archivo es muy pesado para ser sticker (Max 1MB).',
                },
                { quoted: m },
              );
              continue;
            }

            await sock.sendMessage(
              jid,
              {
                sticker: stickerBuffer,
                isAnimated: isVideo || isSticker,
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

        if (message === '#toimage' || message === '#toimg') {
          if (!quoted?.stickerMessage) {
            await sock.sendMessage(
              jid,
              { text: 'Por favor, responde a un sticker.' },
              { quoted: m },
            );
            continue;
          }

          if (quoted.stickerMessage.isAnimated) {
            await sock.sendMessage(
              jid,
              { text: 'Solo stickers sin movimiento.' },
              { quoted: m },
            );
            continue;
          }

          try {
            const stream = await downloadContentFromMessage(
              quoted.stickerMessage,
              'sticker',
            );

            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
              buffer = Buffer.concat([buffer, chunk]);
            }

            const timestamp = Date.now();
            const inputPath = `./temp_${timestamp}.webp`;
            const outputPath = `./temp_${timestamp}.png`;

            fs.writeFileSync(inputPath, buffer);

            await new Promise((resolve, reject) => {
              ffmpeg(inputPath)
                .on('error', (err) => {
                  console.error('Error en ffmpeg:', err);
                  reject(err);
                })
                .on('end', () => {
                  resolve(true);
                })
                .save(outputPath);
            });

            const imageBuffer = fs.readFileSync(outputPath);

            await sock.sendMessage(
              jid,
              {
                image: imageBuffer,
              },
              { quoted: m },
            );

            fs.unlinkSync(inputPath);
            fs.unlinkSync(outputPath);
          } catch (error) {
            console.error('Error detallado al convertir sticker:', error);
            await sock.sendMessage(
              jid,
              { text: 'Ocurrió un error al procesar la imagen.' },
              { quoted: m },
            );
          }
        }
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
