const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Economy = require('../models/Economia');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crear-cuenta')
        .setDescription('Abre tu cuenta bancaria en una de las instituciones de Nuevo Laredo.')
        .addStringOption(option =>
            option.setName('banco')
                .setDescription('Elige el banco donde deseas abrir tu cuenta')
                .setRequired(true)
                .addChoices(
                    { name: 'Assesan Bank Company', value: 'SUBSIDIARY_A' },
                    { name: 'BBVA', value: 'SUBSIDIARY_B' }
                )),

    async execute(interaction) {
        const bancoElegido = interaction.options.getString('banco');
        const nombreBanco = bancoElegido === 'SUBSIDIARY_A' ? 'Assesan Bank Company' : 'BBVA';

        try {
            // Buscamos si el usuario ya tiene un registro en la tabla Economia
            let [userProfile, created] = await Economy.findOrCreate({
                where: { discordId: interaction.user.id },
                defaults: {
                    cartera: 0,
                    banco: 0,
                    ilega: 0,
                    creditScore: 5, // Score inicial según la ley
                    hambre: 100,
                    sed: 100,
                    inventario: "[]"
                }
            });

            // Si ya existe y el saldo en 'banco' es mayor a -1 (o sea, ya tiene cuenta), podrías validar aquí
            // Pero como tu modelo solo tiene una columna 'banco', asumiremos que se "registra" en el sistema del banco elegido.
            
            const embed = new EmbedBuilder()
                .setColor(16448250)
                .setThumbnail("https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png")
                .setDescription(
                    `# <a:71227checkyes:1444377968171286622> APERTURA DE CUENTA\n\n` +
                    `Bienvenido al sistema financiero de **Nuevo Laredo**, <@${interaction.user.id}>.\n\n` +
                    `> **Institución:** \`${nombreBanco}\`\n` +
                    `> **Estado:** \`ACTIVA\`\n` +
                    `> **Credit Score Inicial:** \`5/10\`\n\n` +
                    `<:4666xmark:1444377925930713240> *Recuerda que el mal uso de tus créditos bajará tu puntuación.*`
                )
                .setFooter({ 
                    text: "[MXLN] Mexico Nuevo Laredo", 
                    iconURL: "https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png" 
                });

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error("Error al crear cuenta:", error);
            await interaction.reply({ 
                content: "<:4666xmark:1444377925930713240> Error al procesar el trámite bancario.", 
                flags: [MessageFlags.Ephemeral] 
            });
        }
    }
};