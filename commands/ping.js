// /commands/util/ping.js - Versión Componentes V2
const {
  SlashCommandBuilder,
  EmbedBuilder, // Mantenemos por si es necesario, pero no se usará directamente para el mensaje principal
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  // Componentes V2
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  // Usamos un valor fijo para el espaciado ya que no importamos el enum en este archivo
  // const SeparatorSpacingSize = { Small: 1, Medium: 2, Large: 3 };
} = require('discord.js');
const os = require('os');
const { version: djsVersion } = require('discord.js');

// --- Funciones de Utilidad (SIN CAMBIOS) ---
function formatMs(ms) {
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return [
    d ? `${d}d` : null,
    h ? `${h}h` : null,
    m ? `${m}m` : null,
    `${s}s`,
  ].filter(Boolean).join(' ');
}
function getPingColor(ms) {
  if (ms < 100) return 0x22c55e; // verde
  if (ms < 250) return 0xeab308; // amarillo
  return 0xef4444;               // rojo
}
function bytesToMB(b) {
  return (b / 1024 / 1024).toFixed(1);
}
function safeNumber(n, fallback = 0) {
  return Number.isFinite(n) ? n : fallback;
}

// --- Componente V2 Constructor ---
function buildPingContainer(interaction, roundTrip, wsPing, mem, client, guilds, approxUsers, timestamp, isRefresh = false) {
  const color = getPingColor(roundTrip);
  const heapMB = bytesToMB(mem.heapUsed);
  const rssMB = bytesToMB(mem.rss);

  const container = new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(
      // Título y Autor/Icono
      new TextDisplayBuilder()
        .setContent(
          `# 🛰️ Estado del Bot (${client.user.tag})\n\n` +
          `## \u001b[2m» Aura/Diagnostics »\u001b[0m`
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true)) // Small Separator

    // Latencia y Sistema
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          '### ⚡ Latencia & Sistema\n' +
          `**RTT** (Ida/Vuelta): \`${roundTrip} ms\`\n` +
          `**WS Ping** (Gateway): \`${wsPing} ms\`\n` +
          `**Uptime**: \`${formatMs(client.uptime ?? 0)}\`\n` +
          `**Memoria (RSS/Heap)**: \`${rssMB} MB / ${heapMB} MB\`\n` +
          `**Node.js**: \`${process.version}\`\n` +
          `**discord.js**: \`v${djsVersion}\`\n` +
          `**SO**: \`${os.type()} ${os.release()} ${os.arch()}\``
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(2).setDivider(true)) // Medium Separator

    // Recursos
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          '### 📊 Recursos\n' +
          `**Servidores**: \`${guilds}\`\n` +
          `**Usuarios (Aprox.)**: \`~${approxUsers.toLocaleString()}\``
        )
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(2).setDivider(true)) // Medium Separator

    // Footer
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          `*Última actualización: ${timestamp.toLocaleTimeString()}*\n` +
          `**Sistema**: ${interaction.client.user.tag}`
        )
    );

  return container;
}


module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Muestra latencia, estado del bot y datos útiles.')
    .addBooleanOption(opt =>
      opt
        .setName('privado')
        .setDescription('Si es verdadero, solo tú verás la respuesta.')
    )
    .setDMPermission(true),

  async execute(interaction) {
    const ephemeral = interaction.options.getBoolean('privado') ?? false;

    // Permisos básicos (solo en servidores)
    if (interaction.inGuild()) {
      const perms = interaction.channel?.permissionsFor(interaction.client.user);
      if (perms && !perms.has(PermissionFlagsBits.ViewChannel)) {
        if (!interaction.replied && !interaction.deferred) {
          return interaction.reply({ content: '❌ No puedo ver este canal.', flags: MessageFlags.Ephemeral });
        } else {
          return;
        }
      }
      // Ya no necesitamos 'EmbedLinks', ahora necesitamos 'SendMessages' para enviar componentes V2.
      // Pero 'SendMessages' es un permiso básico que ya se comprueba en muchos loaders.
    }

    try {
      // 1. Defer Reply y Medición
      if (!interaction.replied && !interaction.deferred) {
        await interaction.deferReply({ ephemeral });
      }
      const tempMsg = await interaction.editReply({ content: '⏱️ Midiendo latencia…' });
      const roundTrip = safeNumber(tempMsg.createdTimestamp - interaction.createdTimestamp, 0);
      const wsPing = safeNumber(interaction.client.ws.ping, 0);

      const client = interaction.client;
      const mem = process.memoryUsage();
      const guilds = client.guilds.cache.size;
      const approxUsers = client.guilds.cache.reduce((acc, g) => acc + (g.memberCount || 0), 0);
      const inviteURL = process.env.BOT_INVITE_URL;
      const supportURL = process.env.SUPPORT_SERVER_URL;
      const now = new Date();
      
      // 2. Construir el Mensaje V2
      const container = buildPingContainer(interaction, roundTrip, wsPing, mem, client, guilds, approxUsers, now);

      // 3. Botones (V1 ActionRow)
      const row = new ActionRowBuilder();
      const refreshBtn = new ButtonBuilder()
        .setCustomId('ping:refresh')
        .setLabel('Refrescar')
        .setEmoji('🔁')
        .setStyle(ButtonStyle.Primary);
      row.addComponents(refreshBtn);

      if (inviteURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('Invitar')
            .setStyle(ButtonStyle.Link)
            .setURL(inviteURL)
        );
      }
      if (supportURL) {
        row.addComponents(
          new ButtonBuilder()
            .setLabel('Soporte')
            .setStyle(ButtonStyle.Link)
            .setURL(supportURL)
        );
      }
      
      // 4. Enviar el mensaje con el Container V2 y la flag
      const msg = await interaction.editReply({ 
        content: '', 
        components: [container, row], // Container V2 + ActionRow V1
        flags: MessageFlags.IsComponentsV2,
      });

      // 5. Collector para refrescar
      const collector = msg.createMessageComponentCollector({
        time: 60_000,
        filter: i => i.user.id === interaction.user.id && i.customId.startsWith('ping:'),
      });

      collector.on('collect', async (i) => {
        if (i.customId === 'ping:refresh') {
          // Deferir la actualización
          await i.deferUpdate().catch(() => {});
          
          // Recalcular métricas
          const pingStart = Date.now();
          const refreshedMsg = await i.editReply({ content: '✅' }).catch(() => null); // Mensaje temporal de éxito
          
          // La medición del RTT es más compleja aquí ya que la interacción se maneja de forma diferente al mensaje inicial
          // Usaremos la diferencia de tiempo entre el inicio y el final de la edición de la respuesta, sumando el WS ping.
          const refreshedRTT = safeNumber(Date.now() - pingStart + interaction.client.ws.ping, 0); 

          const newWs = safeNumber(client.ws.ping, 0);
          const newMem = process.memoryUsage();
          const newNow = new Date();

          // Reconstruir el Container V2
          const refreshedContainer = buildPingContainer(
            i, refreshedRTT, newWs, newMem, client, guilds, approxUsers, newNow, true
          );

          // Reconstruir la ActionRow
          const newRow = ActionRowBuilder.from(row); // Reutilizamos la ActionRow original

          await i.editReply({ 
            content: '', 
            components: [refreshedContainer, newRow], 
            flags: MessageFlags.IsComponentsV2 // ¡Importante mantener la flag!
          }).catch(() => {});
        }
      });

      collector.on('end', async () => {
        try {
          // Deshabilitar solo el botón de refresco al expirar
          const disabledRow = ActionRowBuilder.from(row);
          disabledRow.components = disabledRow.components.map((btn) => {
            if (btn.data?.style !== ButtonStyle.Link && btn.data?.custom_id === 'ping:refresh') {
              return ButtonBuilder.from(btn).setDisabled(true);
            }
            return btn;
          });
          // Editamos el mensaje final para deshabilitar el botón
          await msg.edit({ components: [container, disabledRow] }).catch(() => {});
        } catch {}
      });

    } catch (err) {
      console.error('[PING CMD ERROR V2]', err);
      const fallback = `❌ Ocurrió un error al ejecutar /ping (V2).\n\`\`\`js\n${(err && err.stack) ? String(err.stack).slice(0, 1700) : String(err)}\n\`\`\``;
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: fallback, embeds: [], components: [] }).catch(()=>{});
      }
      return interaction.reply({ content: fallback, flags: MessageFlags.Ephemeral }).catch(()=>{});
    }
  },
};