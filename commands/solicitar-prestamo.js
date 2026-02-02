const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');
const Economia = require('../models/Economia');

// Obtiene el credit score real del usuario desde la base de datos
async function getCreditScore(userId) {
    const user = await Economia.findOne({ where: { discordId: userId } });
    return user ? user.creditScore : 0;
}

// Obtiene los préstamos disponibles desde el archivo persistente
function getAvailableLoans() {
    const loansPath = path.join(__dirname, '../data/loans.json');
    if (!fs.existsSync(loansPath)) return [];
    const loans = JSON.parse(fs.readFileSync(loansPath, 'utf8'));
    return loans.map((l, i) => ({
        label: l.nombre,
        value: String(i),
        description: `Monto: $${l.monto}, Interés: ${l.interes}%, Plazo: ${l.plazo}`
    }));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('solicitar-préstamo')
        .setDescription('Solicita un préstamo a un banco subsidiario.'),
    async execute(interaction) {
        const user = interaction.user;
        const creditScore = await getCreditScore(user.id);
        const loans = getAvailableLoans();

        const embed = new EmbedBuilder()
            .setTitle('Solicitud de Préstamo')
            .addFields(
                { name: 'Usuario', value: user.username, inline: true },
                { name: 'Credit Score', value: creditScore.toString(), inline: true }
            )
            .setColor(0x00AE86);

        if (loans.length === 0) {
            embed.setDescription('No hay préstamos disponibles actualmente.');
            await interaction.reply({ embeds: [embed], ephemeral: true });
            return;
        }

        const loanMenu = new StringSelectMenuBuilder()
            .setCustomId('select-loan')
            .setPlaceholder('Selecciona un préstamo disponible')
            .addOptions(loans);

        const row = new ActionRowBuilder().addComponents(loanMenu);

        await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
    },
};
