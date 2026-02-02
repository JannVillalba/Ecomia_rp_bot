const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

function saveLoanType({ bancoId, nombre, monto, interes, plazo, pagoMensual }) {
    const loansPath = path.join(__dirname, '../data/loans.json');
    let loans = [];
    if (fs.existsSync(loansPath)) {
        loans = JSON.parse(fs.readFileSync(loansPath, 'utf8'));
    }
    loans.push({ bancoId, nombre, monto, interes, plazo, pagoMensual });
    fs.writeFileSync(loansPath, JSON.stringify(loans, null, 2));
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crear-tipo-préstamo')
        .setDescription('Crea un nuevo tipo de préstamo para el banco.')
        .addStringOption(opt =>
            opt.setName('nombre')
                .setDescription('Nombre del préstamo')
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('monto')
                .setDescription('Monto a prestar')
                .setRequired(true))
        .addNumberOption(opt =>
            opt.setName('interes')
                .setDescription('Tasa de interés mensual (%)')
                .setRequired(true))
        .addStringOption(opt =>
            opt.setName('plazo')
                .setDescription('Plazo (ej: 6-meses, 1-año)')
                .setRequired(true))
        .addIntegerOption(opt =>
            opt.setName('pago_mensual')
                .setDescription('Pago mensual + interés')
                .setRequired(true)),
    async execute(interaction) {
        const bancoId = interaction.guildId; // O usa otro identificador de banco
        const nombre = interaction.options.getString('nombre');
        const monto = interaction.options.getInteger('monto');
        const interes = interaction.options.getNumber('interes');
        const plazo = interaction.options.getString('plazo');
        const pagoMensual = interaction.options.getInteger('pago_mensual');

        saveLoanType({ bancoId, nombre, monto, interes, plazo, pagoMensual });

        await interaction.reply({ content: `Tipo de préstamo "${nombre}" creado correctamente.`, ephemeral: true });
    },
};
