const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');

// --- CONFIGURACIÓN ---
const CANAL_SOLICITUDES = '1465725546779639960'; 
const CANAL_PERMITIDO = '1460692332545310813';
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const LOGO_URL = "https://images-ext-1.discordapp.net/external/HgQ_1OH-lZ46gsA90Wc7QnIbhFn80fNA3d1HPoPDd20/%3Fsize%3D4096/https/cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png?format=webp&quality=lossless&width=648&height=648";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cobrar')
        .setDescription('Solicita el pago de tu sueldo para revisión.')
        .addStringOption(opt => opt.setName('trabajo').setDescription('Nombre de la institución o empresa').setRequired(true))
        .addStringOption(opt => opt.setName('evidencia').setDescription('Enlace a la imagen/evidencia del trabajo').setRequired(true)),

    async execute(interaction) {
        if (interaction.channelId !== CANAL_PERMITIDO) {
            return interaction.reply({ 
                content: `${EMOJI_ERROR} Solo en <#${CANAL_PERMITIDO}>.`, 
                flags: MessageFlags.Ephemeral 
            });
        }

        const trabajo = interaction.options.getString('trabajo');
        const evidencia = interaction.options.getString('evidencia');
        const canalAdmin = interaction.guild.channels.cache.get(CANAL_SOLICITUDES);

        if (!canalAdmin) return interaction.reply({ content: 'Error: Canal de administración no encontrado.', flags: MessageFlags.Ephemeral });

        // --- 1. ENVIAR SOLICITUD AL CANAL DE JEFES ---
        const adminContainer = new ContainerBuilder()
            .setAccentColor(3487029)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## 📑 Nueva Solicitud de Sueldo\n` +
                `**Solicitante:** ${interaction.user} (${interaction.user.id})\n` +
                `**Empresa:** ${trabajo}\n` +
                `**Evidencia:** [Ver Imagen](${evidencia})`)
            );

        const adminButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`aprobar_${interaction.user.id}_${trabajo}`)
                .setLabel('Aprobar Pago')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId(`rechazar_${interaction.user.id}`)
                .setLabel('Rechazar')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌')
        );

        await canalAdmin.send({ 
            components: [adminContainer, adminButtons],
            flags: MessageFlags.IsComponentsV2 
        });

        // --- 2. RESPUESTA AL USUARIO (DISEÑO SOLICITADO) ---
        const userContainer = new ContainerBuilder()
            .setAccentColor(3487029)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${EMOJI_CHECK} Sueldo solicitado correctamente.\n` +
                `> Espera que el jefe o dueño de la institucion/empresa acepte tu solicitud de dinero.`)
            );
        // Nota: Components V2 no soporta thumbnails/footers nativos como los embeds antiguos, 
        // pero puedes poner el logo como texto o esperar a la implementación total.
        // Aquí lo enviamos como respuesta visualmente similar.

        await interaction.reply({ 
            components: [userContainer], 
            flags: MessageFlags.IsComponentsV2 
        });
    }
};