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
                .setDescription('Elige la institución bancaria')
                .setRequired(true)
                .addChoices(
                    { name: 'Assesan Bank Company', value: 'SUBSIDIARY_A' },
                    { name: 'BBVA', value: 'SUBSIDIARY_B' }
                )),

    async execute(interaction) {
        const bancoId = interaction.options.getString('banco');
        const nombreBanco = bancoId === 'SUBSIDIARY_A' ? 'Assesan Bank Company' : 'BBVA';

        // 1. Cargar configuraciones
        if (!fs.existsSync(configPath)) {
            return interaction.reply({ 
                content: `<:4666xmark:1444377925930713240> El sistema central de Hacienda está fuera de línea.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const opcionesBanco = config[bancoId] || [];

        if (opcionesBanco.length === 0) {
            return interaction.reply({ 
                content: `<:4666xmark:1444377925930713240> **${nombreBanco}** no tiene ventanillas abiertas en este momento.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        // 2. Crear el Select Menu
        const select = new StringSelectMenuBuilder()
            .setCustomId('menu-cuentas')
            .setPlaceholder('Selecciona el contrato bancario...');

        opcionesBanco.forEach((tipo, index) => {
            select.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(tipo.nombre)
                    .setDescription(`Costo: $${tipo.costo} | Interés: ${tipo.tasa}%`)
                    .setValue(`${index}`) 
            );
        });

        const row = new ActionRowBuilder().addComponents(select);

        const response = await interaction.reply({
            content: `### 🇲🇽 Solicitud de Apertura: **${nombreBanco}**\nPor favor, elige el tipo de cuenta que deseas contratar:`,
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        // 3. Collector
        const collector = response.createMessageComponentCollector({ time: 30000 });

        collector.on('collect', async i => {
            const indexElegido = parseInt(i.values[0]);
            const cuentaData = opcionesBanco[indexElegido];

            try {
                // Buscamos o creamos perfil
                let [userProfile] = await Economy.findOrCreate({
                    where: { discordId: i.user.id },
                    defaults: { 
                        cartera: 0, 
                        banco: 0, 
                        ilega: 0, 
                        creditScore: 5, 
                        bancoNombre: 'Ninguno', // Valor inicial
                        cuentaTipo: 'Sin cuenta'  // Valor inicial
                    }
                });

                // Verificar lana
                if (userProfile.cartera < cuentaData.costo) {
                    return i.update({ 
                        content: `<:4666xmark:1444377925930713240> Fondos insuficientes. Necesitas **$${cuentaData.costo}** en efectivo.`, 
                        components: [] 
                    });
                }

                // --- ACTUALIZACIÓN DE LA BASE DE DATOS ---
                await userProfile.update({
                    cartera: userProfile.cartera - cuentaData.costo,
                    bancoNombre: nombreBanco,       // <-- AQUÍ SE GUARDA PARA EL /SALDO
                    cuentaTipo: cuentaData.nombre,   // <-- AQUÍ SE GUARDA PARA EL /SALDO
                    tasaInteres: cuentaData.tasa     // Opcional si tienes esta columna
                });

                // Logica de ingresos del banco (ID del banco como usuario)
                let [bancoDB] = await Economy.findOrCreate({ where: { discordId: bancoId } });
                await bancoDB.update({ banco: bancoDB.banco + cuentaData.costo });

                const successEmbed = new EmbedBuilder()
                    .setColor(16448250)
                    .setTitle("<a:71227checkyes:1444377968171286622> CONTRATO FORMALIZADO")
                    .setThumbnail("https://cdn.discordapp.com/icons/1377710554663358494/f37a322cda3fefecf7d691b32a530275.png")
                    .setDescription(
                        `Bienvenido al sistema financiero de Nuevo Laredo, <@${i.user.id}>.\n\n` +
                        `> **Institución:** \`${nombreBanco}\`\n` +
                        `> **Producto:** \`${cuentaData.nombre}\`\n` +
                        `> **Rendimiento:** \`${cuentaData.tasa}%\` anual\n` +
                        `> **Comisión de apertura:** \`$${cuentaData.costo} MXN\`\n\n` +
                        `*Tu cuenta está lista para recibir depósitos. Consulta tu estado con \`/saldo\`.*`
                    )
                    .setFooter({ text: "Hacienda Municipal de Nuevo Laredo" })
                    .setTimestamp();

                await i.update({ content: '', embeds: [successEmbed], components: [] });

            } catch (err) {
                console.error(err);
                await i.update({ content: "❌ Error en la conexión con la red bancaria.", components: [] });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: '⌛ Trámite cancelado por inactividad.', components: [] });
            }
        });
    }
};