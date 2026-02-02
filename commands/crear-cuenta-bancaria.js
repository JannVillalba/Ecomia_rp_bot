const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

function getBancosYTipos() {
    const accountsPath = path.join(__dirname, '../data/debit_accounts.json');
    if (!fs.existsSync(accountsPath)) return { bancos: [], tiposCuenta: [] };
    const cuentas = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    // Agrupar por bancoId y mostrar nombre amigable
    const bancos = [...new Map(cuentas.map(c => [c.bancoId, c])).values()]
        .map(c => ({ id: c.bancoId, nombre: c.nombre || 'Banco Desconocido' }));
    return { bancos, tiposCuenta: cuentas };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crear-cuenta-bancaria')
        .setDescription('Crea una cuenta bancaria en un banco subsidiario.'),
    async execute(interaction) {
        const { bancos, tiposCuenta } = getBancosYTipos();
        if (bancos.length === 0) {
            await interaction.reply({ content: 'No hay bancos ni tipos de cuenta disponibles.', ephemeral: true });
            return;
        }
        const bancoMenu = new StringSelectMenuBuilder()
            .setCustomId('select-bank')
            .setPlaceholder('Selecciona un banco')
            .addOptions(bancos.map(b => ({ label: b.nombre, value: b.id })));
        const row = new ActionRowBuilder().addComponents(bancoMenu);
        await interaction.reply({ content: 'Selecciona un banco para crear tu cuenta:', components: [row], ephemeral: true });
    },
};
