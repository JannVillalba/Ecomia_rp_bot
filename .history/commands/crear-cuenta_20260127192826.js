const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    MessageFlags, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    StringSelectMenuOptionBuilder 
} = require('discord.js');
const Economy = require('../models/Economia');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../../data/bancos_config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crear-cuenta')
        .setDescription('Abre tu cuenta bancaria en Nuevo Laredo.')
        .addStringOption(option =>
            option.setName('banco')
                .setDescription('Elige el banco')
                .setRequired(true)
                .addChoices(
                    { name: 'Assesan Bank Company', value: 'SUBSIDIARY_A' },
                    { name: 'BBVA', value: 'SUBSIDIARY_B' }
                )),

    async execute(interaction) {
        const bancoId = interaction.options.getString('banco');
        const nombreBanco = bancoId === 'SUBSIDIARY_A' ? 'Assesan Bank Company' : 'BBVA';

        // 1. Cargar configuraciones de tipos de cuenta
        if (!fs.existsSync(configPath)) {
            return interaction.reply({ 
                content: `<:4666xmark:1444377925930713240> El sistema bancario aún no ha configurado tipos de cuenta.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const opcionesBanco = config[bancoId] || [];

        if (opcionesBanco.length === 0) {
            return interaction.reply({ 
                content: `<:4666xmark:1444377925930713240> **${nombreBanco}** no tiene cuentas disponibles en este momento.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // 2. Crear el Select Menu
        const select = new StringSelectMenuBuilder()
            .setCustomId('menu-cuentas')
            .setPlaceholder('Selecciona el tipo de cuenta que deseas abrir...');

        opcionesBanco.forEach((tipo, index) => {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(tipo.nombre)
                    .setDescription(`Costo: M$${tipo.costo} | Interés: ${tipo.tasa}%`)
                    .setValue(`${index}`) // Guardamos el índice para recuperar los datos luego
            );
        });

        const row = new ActionRowBuilder().addComponents(select);

        const response = await interaction.reply({
            content: `### 🇲🇽 Trámite de apertura en **${nombreBanco}**\nSelecciona una opción del menú de abajo:`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        // 3. Collector para recibir la elección (duración 30 segundos)
        const collector = response.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            const indexElegido = parseInt(i.values[0]);
            const cuentaData = opcionesBanco[indexElegido];

            try {
                // Buscamos perfil del usuario
                let [userProfile] = await Economy.findOrCreate({
                    where: { discordId: i.user.id },
                    defaults: { cartera: 0, banco: 0, ilega: 0, creditScore: 5, hambre: 100, sed: 100, inventario: "[]" }
                });

                // Verificar si tiene lana en cartera para abrirla
                if (userProfile.cartera < cuentaData.costo) {
                    return i.update({ 
                        content: `<:4666xmark:1444377925930713240> No tienes los **M$${cuentaData.costo}** necesarios en tu cartera.`, 
                        components: [] 
                    });
                }

                // Cobrar y activar cuenta
                await userProfile.update({
                    cartera: userProfile.cartera - cuentaData.costo
                });

                // Enviar dinero del costo de apertura al banco (para que no desaparezca la lana del server)
                let [bancoDB] = await Economy.findOrCreate({ where: { discordId: bancoId } });
                await bancoDB.update({ banco: bancoDB.banco + cuentaData.costo });

                const successEmbed = new EmbedBuilder()
                    .setColor(16448250)
                    .setThumbnail("https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png")
                    .setDescription(
                        `# <a:71227checkyes:1444377968171286622> CUENTA APERTURADA\n\n` +
                        `Felicidades <@${i.user.id}>, tu trámite ha sido aprobado.\n\n` +
                        `> **Banco:** \`${nombreBanco}\`\n` +
                        `> **Tipo:** \`${cuentaData.nombre}\`\n` +
                        `> **Tasa Mensual:** \`${cuentaData.tasa}%\`\n` +
                        `> **Costo Pagado:** \`M$${cuentaData.costo}\`\n\n` +
                        `*Tu saldo inicial es de M$0. Usa /depositar para empezar.*`
                    )
                    .setFooter({ text: "[MXLN] Mexico Nuevo Laredo" });

                await i.update({ content: '', embeds: [successEmbed], components: [] });

            } catch (err) {
                console.error(err);
                await i.update({ content: "❌ Error interno al procesar la cuenta.", components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: '⌛ El tiempo para elegir cuenta ha expirado.', components: [] });
            }
        });
    }
};