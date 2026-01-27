const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, PermissionFlagsBits } = require('discord.js');
const Cedula = require('../models/Cedula');

// IDs de roles y canales
const ADMIN_ROLE_ID = '1409090648534941757';
const ANTECEDENTES_ROLE_ID = '1409090704046686289';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('antecedentes')
        .setDescription('Consulta o borra los antecedentes de un ciudadano.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario de Discord a consultar.')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

    async execute(interaction) {
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({
                content: '❌ No tienes permisos para usar este comando.',
                ephemeral: true,
            });
        }

        const targetUser = interaction.options.getUser('usuario');
        const cedulaInfo = await Cedula.findOne({ where: { discordId: targetUser.id } });
        
        await interaction.deferReply({ ephemeral: true });

        if (!cedulaInfo || !cedulaInfo.antecedentes || cedulaInfo.antecedentes.length === 0) {
            return interaction.editReply({
                content: `✅ El usuario **${targetUser.tag}** no tiene antecedentes registrados.`,
            });
        }
        
        const tieneRol = interaction.guild.members.cache.get(targetUser.id)?.roles.cache.has(ANTECEDENTES_ROLE_ID);

        const detalles = cedulaInfo.antecedentes.map((ant, index) => {
            const fecha = new Date(ant.fecha).toLocaleString('es-ES');
            return `**- Caso #${index + 1}**
            > 🗓️ **Fecha:** ${fecha}
            > 👮 **Oficial:** ${ant.oficial}
            > 📜 **Delitos:** \`${ant.delitos.join(', ')}\`
            > ⚖️ **Sentencia:** \`${ant.prision}s\` / \`$${ant.multa.toLocaleString()}\`
            ${index < cedulaInfo.antecedentes.length - 1 ? '---' : ''}`;
        }).join('\n\n');

        const antecedenteEmbed = new EmbedBuilder()
            .setColor('#E74C3C')
            .setTitle(`🚨 ANTECEDENTES DE ${cedulaInfo.nombres} ${cedulaInfo.apellidos} 🚨`)
            .setDescription(`**Estado del Rol:** ${tieneRol ? '✅ Con rol de antecedentes' : '❌ Sin rol de antecedentes'}\n\n` + detalles)
            .setFooter({ text: 'Pulsa el botón si deseas eliminar todos los antecedentes del registro.' })
            .setTimestamp();

        const borrarButton = new ButtonBuilder()
            .setCustomId(`borrar_antecedentes_${targetUser.id}`)
            .setLabel('Borrar Antecedentes')
            .setStyle(ButtonStyle.Danger);

        const row = new ActionRowBuilder().addComponents(borrarButton);

        await interaction.editReply({
            embeds: [antecedenteEmbed],
            components: [row],
        });
    },
};