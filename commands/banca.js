const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Economy = require('../models/Economia');

const BANK_CHANNEL_ID = "1460692332545310813";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banca')
        .setDescription('Estado de la Reserva Federal de Nuevo Laredo.'),

    async execute(interaction) {
        if (interaction.channelId !== BANK_CHANNEL_ID) {
            return interaction.reply({ 
                content: `<:4666xmark:1444377925930713240> Acceso restringido a la red bancaria de Nuevo Laredo.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        try {
            // Buscamos las entidades en tu tabla Economia
            const entities = await Economy.findAll({
                where: { discordId: ['FEDERAL_RESERVE', 'SUBSIDIARY_A', 'SUBSIDIARY_B'] }
            });

            const getBalance = (id) => {
                const entity = entities.find(e => e.discordId === id);
                return entity ? entity.banco : 0;
            };

            // Formateador de moneda (M$)
            const f = (val) => new Intl.NumberFormat('en-US').format(val);

            const central = getBalance('FEDERAL_RESERVE');
            const subA = getBalance('SUBSIDIARY_A');
            const subB = getBalance('SUBSIDIARY_B');

            const embed = new EmbedBuilder()
                .setColor(16448250)
                .setDescription(
                    `# BANCO DE MÉXICO - NUEVO LAREDO  :flag_mx:\n\n` +
                    `> <:5526iconbank:1465809664859050249> **Banco Central**\n` +
                    `\`\`\` M$.${f(central)}\`\`\`\n` +
                    `> <:4534belo:1465810602818535554> **Assesan Bank Company**\n` +
                    `\`\`\` M$.${f(subA)}\`\`\`\n` +
                    `> <:3721570d4cf6a511e1ddeec479af499f:1465811209885581312> **BBVA**\n` +
                    `\`\`\` M$.${f(subB)}\`\`\``
                )
                .setThumbnail("https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png?size=4096");

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Error en /banca:", error);
            await interaction.reply({ 
                content: "❌ Error al conectar con el servidor central.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    },
};