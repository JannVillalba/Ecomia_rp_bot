const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rechazar-sueldo')
        .setDescription('Rechaza una solicitud de sueldo.')
        .addUserOption(opt => opt.setName('usuario').setDescription('El empleado').setRequired(true))
        .addStringOption(opt => opt.setName('razon').setDescription('Motivo del rechazo').setRequired(true)),

    async execute(interaction) {
        const personalPath = path.join(__dirname, '../../data/personal.json');
        const personal = JSON.parse(fs.readFileSync(personalPath, 'utf8'));

        if (!personal.admins.includes(interaction.user.id)) {
            return interaction.reply({ content: '❌ No autorizado.', flags: MessageFlags.Ephemeral });
        }

        const empleado = interaction.options.getUser('usuario');
        const razon = interaction.options.getString('razon');

        await interaction.reply({ content: `❌ Solicitud de ${empleado} rechazada. Razón: ${razon}` });
        
        await empleado.send(`⚠️ Tu solicitud de sueldo ha sido rechazada.\n**Razón:** ${razon}`).catch(() => {});
    }
};