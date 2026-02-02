const { SlashCommandBuilder } = require('discord.js');

const fs = require('fs');
const path = require('path');

function saveDebitAccountType({ bancoId, nombre, costo, interes }) {
    const accountsPath = path.join(__dirname, '../data/debit_accounts.json');
    let accounts = [];
    if (fs.existsSync(accountsPath)) {
        accounts = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
    }
    accounts.push({ bancoId, nombre, costo, interes });
    fs.writeFileSync(accountsPath, JSON.stringify(accounts, null, 2));
    return true;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('create-debit-account')
        .setDescription('Crea un nuevo tipo de cuenta de débito para el banco.')
        .addStringOption(opt =>
            opt.setName('nombre')
                .setDescription('Nombre del tipo de cuenta')
                .setRequired(true))
        .addNumberOption(opt =>
            opt.setName('costo')
                .setDescription('Costo de mantenimiento (%)')
                .setRequired(true))
        .addNumberOption(opt =>
            opt.setName('interes')
                .setDescription('Tasa de interés anual (%)')
                .setRequired(true)),
    async execute(interaction) {
        const bancoId = interaction.guildId; // O usa otro identificador de banco
        const nombre = interaction.options.getString('nombre');
        const costo = interaction.options.getNumber('costo');
        const interes = interaction.options.getNumber('interes');

        saveDebitAccountType({ bancoId, nombre, costo, interes });

        await interaction.reply({ content: `Tipo de cuenta de débito "${nombre}" creado correctamente.`, ephemeral: true });
    },
};
