import makeWASocket, {
  ConnectionState,
  DisconnectReason,
  useMultiFileAuthState,
  downloadMediaMessage,
  downloadContentFromMessage,
  GroupMetadata,
} from 'baileys';
import { Boom } from '@hapi/boom';
import P from 'pino';
import QRCode from 'qrcode';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const groupCache = new Map<
  string,
  { data: GroupMetadata; timestamp: number }
>();
const CACHE_TTL = 60 * 1000;

let sock: ReturnType<typeof makeWASocket>;

let isBotActive = true;

async function connectToWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState('wa-session');

  sock = makeWASocket({
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
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
    if (event.type !== 'notify') return;

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
        const sender = m.key.participant || m.key.remoteJid;

        const botJid = sock.user?.id
          ? sock.user.id.split(':')[0] + '@s.whatsapp.net'
          : '';
        const senderJid = sender
          ? sender.split(':')[0] + '@s.whatsapp.net'
          : '';

        const isOwner = m.key.fromMe || senderJid === botJid;
        const isGroup = jid.endsWith('@g.us');

        let isAdmin = false;
        let groupMetadata: GroupMetadata | undefined;

        if (isGroup && message.startsWith('#')) {
          try {
            const now = Date.now();
            const cached = groupCache.get(jid);

            if (cached && now - cached.timestamp < CACHE_TTL) {
              groupMetadata = cached.data;
            } else {
              groupMetadata = await sock.groupMetadata(jid);
              groupCache.set(jid, { data: groupMetadata, timestamp: now });
            }

            const participant = groupMetadata.participants.find(
              (p) => p.id === sender,
            );
            isAdmin = !!(
              participant?.admin === 'admin' ||
              participant?.admin === 'superadmin'
            );
          } catch (e) {
            console.error('Error obteniendo metadatos (ignorado):', e);
            isAdmin = false;
          }
        }

        if (message.startsWith('#bot ')) {
          const arg = message.split(' ')[1]?.toLowerCase();

          if (!isAdmin && !isOwner) {
            await sock.sendMessage(
              jid,
              { text: 'Este comando es solo para Administradores.' },
              { quoted: m },
            );
            continue;
          }

          if (arg === 'on') {
            if (isBotActive) {
              await sock.sendMessage(
                jid,
                { text: 'El bot ya se encuentra activado.' },
                { quoted: m },
              );
            } else {
              isBotActive = true;
              await sock.sendMessage(
                jid,
                { text: '✅ Bot activado para todos.' },
                { quoted: m },
              );
            }
          } else if (arg === 'off') {
            if (!isBotActive) {
              await sock.sendMessage(
                jid,
                { text: 'El bot ya estaba desactivado.' },
                { quoted: m },
              );
            } else {
              isBotActive = false;
              await sock.sendMessage(
                jid,
                {
                  text: '💤 Bot desactivado.',
                },
                { quoted: m },
              );
            }
          } else {
            await sock.sendMessage(
              jid,
              { text: 'Uso correcto: #bot on | #bot off' },
              { quoted: m },
            );
          }
          continue;
        }

        if (!isBotActive && !isOwner) {
          continue;
        }

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
║├  #pfp [@usuario] | +1 202 555 0123
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
          const targetSticker = quoted?.stickerMessage;
          const targetImage = quoted?.imageMessage || imageMessage;

          if (!targetSticker && !targetImage) {
            await sock.sendMessage(
              jid,
              { text: 'Por favor, responde a un sticker o una imagen.' },
              { quoted: m },
            );
            continue;
          }

          if (targetImage) {
            try {
              const stream = await downloadContentFromMessage(
                targetImage,
                'image',
              );

              let buffer = Buffer.from([]);
              for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
              }

              await sock.sendMessage(jid, { image: buffer }, { quoted: m });
            } catch (error) {
              console.error('Error al replicar imagen:', error);
              await sock.sendMessage(
                jid,
                { text: 'Ocurrió un error al procesar la imagen.' },
                { quoted: m },
              );
            }
            continue;
          }

          if (targetSticker?.isAnimated) {
            await sock.sendMessage(
              jid,
              { text: 'Solo stickers sin movimiento.' },
              { quoted: m },
            );
            continue;
          }

          try {
            const stream = await downloadContentFromMessage(
              targetSticker!,
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
              { text: 'Ocurrió un error al procesar el sticker.' },
              { quoted: m },
            );
          }
        }

        if (message.startsWith('#pfp')) {
          let targetJid: string | undefined;
          const mentions =
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
          const textParam = message.slice(4).trim();

          if (mentions && mentions.length > 0) {
            targetJid = mentions[0];
          } else if (textParam) {
            const cleanNumber = textParam.replace(/\D/g, '');

            if (cleanNumber.length < 6) {
              await sock.sendMessage(
                jid,
                {
                  text: 'El número parece incorrecto, verifica e intenta de nuevo.',
                },
                { quoted: m },
              );
              continue;
            }

            const potentialJid = `${cleanNumber}@s.whatsapp.net`;
            const check = await sock.onWhatsApp(potentialJid);

            if (!check?.[0]?.exists) {
              await sock.sendMessage(
                jid,
                {
                  text: 'El número ingresado no tiene WhatsApp.\n\nEjemplo de uso correcto:\n#pfp +1 202 555 0123',
                },
                { quoted: m },
              );
              continue;
            }
            targetJid = potentialJid;
          } else {
            targetJid = m.key.participant || m.key.remoteJid || undefined;
          }

          if (targetJid) {
            const defaultProfileInfo =
              'https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png';

            let pfpUrl: string = defaultProfileInfo;

            try {
              const url = await sock.profilePictureUrl(targetJid, 'image');
              if (url) {
                pfpUrl = url;
              }
            } catch (e) {
              pfpUrl = defaultProfileInfo;
            }

            await sock.sendMessage(
              jid,
              {
                image: { url: pfpUrl },
              },
              { quoted: m },
            );
          }
        }

        if (message.startsWith('#say')) {
          const textParam = message.slice(4).trim();
          const quoted =
            m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const quotedText =
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption ||
            '';

          let finalMessage = quotedText || textParam;

          if (!finalMessage) {
            await sock.sendMessage(
              jid,
              {
                text: 'Debes escribir un mensaje o responder a uno.\n\nEjemplo:\n#say Hola mundo',
              },
              { quoted: m },
            );
            continue;
          }

          if (finalMessage.startsWith('#')) {
            finalMessage = '\u200B' + finalMessage;
          }

          await sock.sendMessage(jid, {
            text: finalMessage,
          });
          continue;
        }

        if (message.startsWith('#kick')) {
          if (!isAdmin && !isOwner) {
            await sock.sendMessage(
              jid,
              { text: 'Solo administradores pueden usar #kick.' },
              { quoted: m },
            );
            continue;
          }

          let target: string | undefined;

          const mentioned =
            m.message?.extendedTextMessage?.contextInfo?.mentionedJid;
          if (mentioned && mentioned.length > 0) {
            target = mentioned[0];
          }

          if (!target) {
            target =
              m.message?.extendedTextMessage?.contextInfo?.participant ||
              undefined;
          }

          if (!target) {
            const textParam = message.slice(5).trim();
            if (textParam) {
              const cleanNumber = textParam.replace(/\D/g, '');
              if (cleanNumber.length > 6) {
                target = `${cleanNumber}@s.whatsapp.net`;
              }
            }
          }

          if (!target) {
            await sock.sendMessage(
              jid,
              {
                text: 'Etiqueta a alguien, responde a un mensaje o escribe el número para eliminar.',
              },
              { quoted: m },
            );
            continue;
          }

          const isMember = groupMetadata?.participants.find(
            (p) => p.id === target,
          );

          if (!isMember) {
            await sock.sendMessage(
              jid,
              {
                text: 'Este número no está en el grupo. Solo puedo eliminar a integrantes actuales.',
              },
              { quoted: m },
            );
            continue;
          }

          if (target.includes(botJid)) {
            await sock.groupLeave(jid);
            continue;
          }

          const groupCreator = groupMetadata?.owner;
          if (target === groupCreator) {
            await sock.sendMessage(
              jid,
              {
                text: 'No puedo eliminar al creador del grupo.',
              },
              { quoted: m },
            );
            continue;
          }

          try {
            const response = await sock.groupParticipantsUpdate(
              jid,
              [target],
              'remove',
            );

            if (response && response[0]?.status === '200') {
            } else {
              throw new Error('Not Admin or Failed');
            }
          } catch (e) {
            await sock.sendMessage(
              jid,
              {
                text: 'Necesito ser Administrador para poder eliminar usuarios.',
              },
              { quoted: m },
            );
          }
          continue;
        }

        if (message.startsWith('#tag')) {
          if (!isAdmin && !isOwner) {
            await sock.sendMessage(
              jid,
              { text: 'Solo administradores pueden usar #tag.' },
              { quoted: m },
            );
            continue;
          }

          if (!isGroup || !groupMetadata) continue;

          const textParam = message.slice(4).trim();
          const quoted =
            m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          const quotedText =
            quoted?.conversation ||
            quoted?.extendedTextMessage?.text ||
            quoted?.imageMessage?.caption ||
            quoted?.videoMessage?.caption ||
            '';

          let finalMessage = quotedText || textParam;

          if (!finalMessage) {
            await sock.sendMessage(
              jid,
              {
                text: 'Debes escribir un mensaje o responder a uno.\n\nEjemplo:\n#tag Hola a todos',
              },
              { quoted: m },
            );
            continue;
          }

          if (finalMessage.startsWith('#')) {
            finalMessage = '\u200B' + finalMessage;
          }

          const participants = groupMetadata.participants.map((p) => p.id);

          await sock.sendMessage(jid, {
            text: finalMessage,
            mentions: participants,
          });
          continue;
        }
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
