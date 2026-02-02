const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const Economia = require('../models/Economia');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solicitudes-prestamo')
        .setDescription('Ver y gestionar solicitudes de préstamo pendientes (solo admins).'),
    async execute(interaction) {
        // Verificar si el usuario es admin (puedes mejorar esta lógica según tu sistema)
        if (!interaction.member.permissions.has('Administrator')) {
            await interaction.reply({ content: 'No tienes permisos para ver las solicitudes.', ephemeral: true });
            return;
        }
        const solicitudesPath = path.join(__dirname, '../data/loan_requests.json');
        if (!fs.existsSync(solicitudesPath)) {
            await interaction.reply({ content: 'No hay solicitudes pendientes.', ephemeral: true });
            return;
        }
        const solicitudes = JSON.parse(fs.readFileSync(solicitudesPath, 'utf8'));
        const pendientes = solicitudes.filter(s => s.estado === 'pendiente');
        if (pendientes.length === 0) {
            await interaction.reply({ content: 'No hay solicitudes pendientes.', ephemeral: true });
            return;
        }
        // Solo mostrar la primera pendiente para gestionar una a la vez
        const s = pendientes[0];
        const embed = new EmbedBuilder()
            .setTitle('Solicitud de Préstamo')
            .addFields(
                { name: 'Usuario', value: `${s.username} (${s.userId})` },
                { name: 'Préstamo', value: s.loan.nombre },
                { name: 'Monto', value: `$${s.loan.monto}` },
                { name: 'Interés', value: `${s.loan.interes}% mensual` },
                { name: 'Plazo', value: s.loan.plazo },
                { name: 'Fecha', value: s.fecha }
            )
            .setColor(0x00AE86);
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('aprobar-prestamo').setLabel('Aprobar').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('rechazar-prestamo').setLabel('Rechazar').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
