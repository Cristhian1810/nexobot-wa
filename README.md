# 🤖 NyxelBot - Bot de WhatsApp (Baileys)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![NodeJS](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)

**NyxelBot** es un asistente automatizado para WhatsApp rápido, modular y eficiente, desarrollado íntegramente en **TypeScript** utilizando la librería **Baileys**.

Este proyecto fue diseñado para facilitar la gestión de multimedia y utilidades de red dentro de la plataforma, destacando por su capacidad de procesar stickers animados y estáticos con optimización automática de peso.

---

## ⚡ Funcionalidades Principales

El bot está diseñado para operar 24/7 con las siguientes capacidades:

- 🖼️ **Motor de Stickers Inteligente:**
  - Convierte imágenes y fotos en stickers (WebP) al instante.
  - Procesa **videos y GIFs**, transformándolos en stickers animados fluidos.
  - **Algoritmo de Compresión:** Detecta automáticamente si un archivo supera el límite de 1MB de WhatsApp y ajusta la calidad (bitrate) para garantizar el envío sin errores.
- ⏱️ **Validación de Media:** Filtra videos de larga duración (>7s) para mantener el rendimiento del servidor.
- 🏓 **Diagnóstico de Red:** Herramientas integradas para medir la latencia (Ping) y el estado del servicio en tiempo real.
- 📊 **Monitoreo:** Sistema de _uptime_ preciso para controlar el tiempo de actividad del bot.

---

## 🛠️ Stack Tecnológico

La arquitectura del proyecto se basa en las tecnologías más robustas del ecosistema Node.js:

- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/) (Para un código tipado y escalable).
- **Core API:** [Baileys](https://github.com/WhiskeySockets/Baileys) (Conexión ligera y directa a la API Web de WhatsApp).
- **Procesamiento de Video:**
  - `fluent-ffmpeg`: Orquestación de comandos de video.
  - `@ffmpeg-installer`: Gestión automática de binarios FFmpeg multiplataforma.
- **Formato y Metadatos:** `wa-sticker-formatter` (Generación de metadatos Exif y conversión a WebP).

---

## 🚀 Instalación y Despliegue

Si deseas ejecutar una instancia de este bot en tu propio entorno, sigue estos pasos:

### 1. Clonar Repositorio e Instalar Dependencias

```bash
git clone https://github.com/Cristhian1810/nyxelbot-wa.git
cd nyxelbot-wa
npm install
```

### 2. Compilación (Build)

Transforma el código TypeScript a JavaScript optimizado para producción:

```bash
npm run build
```

### 3. Ejecución

Inicia el bot utilizando el código compilado:

```bash
npm start
```

> 📱 **Vinculación:** Al ejecutar el comando `npm start`, la terminal generará un **Código QR**. Abre WhatsApp en tu teléfono, ve a _Dispositivos Vinculados > Vincular un dispositivo_ y escanéalo para iniciar la sesión del bot.

---

## 👤 Autor

Desarrollado y mantenido por **[Cristhian1810](https://github.com/Cristhian1810)**.
