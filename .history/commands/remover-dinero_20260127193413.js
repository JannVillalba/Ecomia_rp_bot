const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const Economia = require('../models/Economia');
const fs = require('fs');
const path = require('path');

// Configuración de rutas y logs
const personalPath = path.join(__dirname, '../../data/personal.json');
const LOG_CHANNEL_ID = '1460692336072851736';

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('remover-dinero')
        .setDescription('Remueve dinero de un usuario o ejecuta una purga global.')
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('El tipo de saldo a remover.')
                .setRequired(true)
                .addChoices(
                    { name: '💰 Cartera', value: 'cartera' },
                    { name: '🏦 Banco', value: 'banco' },
                    { name: '💸 Ilegal', value: 'ilega' },
                    { name: '💥 TODO (Purga)', value: 'todo' },
                ))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón oficial de la remoción.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('Usuario objetivo (Opcional para purga global).')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('Cantidad a remover (No necesaria si eliges "todo").')
                .setRequired(false)),

    async execute(interaction) {
        // 1. Verificar autorización desde personal.json
        let autorizado = false;
        try {
            if (fs.existsSync(personalPath)) {
                const personalData = JSON.parse(fs.readFileSync(personalPath, 'utf8'));
                const listaAdmins = personalData.admins || [];
                if (listaAdmins.includes(interaction.user.id)) autorizado = true;
            }
        } catch (err) {
            console.error("Error leyendo personal.json:", err);
        }

        if (!autorizado) {
            return interaction.reply({ 
                content: '<:4666xmark:1444377925930713240> No tienes autorización de la Secretaría de Hacienda para incautar fondos.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const tipoSaldo = interaction.options.getString('tipo');
        const usuarioObjetivo = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');
        const razon = interaction.options.getString('razon');

        // Validaciones de lógica
        if (tipoSaldo !== 'todo') {
            if (!cantidad || cantidad <= 0) {
                return interaction.reply({ content: '❌ Especifica una cantidad válida mayor a 0.', flags: [MessageFlags.Ephemeral] });
            }
            if (!usuarioObjetivo) {
                return interaction.reply({ content: '❌ Debes seleccionar a un usuario para remover una cantidad específica.', flags: [MessageFlags.Ephemeral] });
            }
        }

        await interaction.deferReply({ 
            flags: (!usuarioObjetivo && tipoSaldo === 'todo') ? [] : [MessageFlags.Ephemeral] 
        });

        let responseEmbed, logEmbed;

        try {
            if (usuarioObjetivo) {
                // --- LÓGICA PARA UN SOLO USUARIO ---
                let userEco = await Economia.findOne({ where: { discordId: usuarioObjetivo.id } });
                if (!userEco) return interaction.editReply('❌ El usuario no tiene registros en la base de datos.');

                let saldoAntes, cantidadEfectiva;
                const info = {
                    cartera: { name: 'Cartera', emoji: '💰' },
                    banco: { name: 'Banco', emoji: '🏦' },
                    ilega: { name: 'Fondos Ilegales', emoji: '💸' },
                    todo: { name: 'Balance Total', emoji: '💥' }
                }[tipoSaldo];

                if (tipoSaldo === 'todo') {
                    saldoAntes = userEco.cartera + userEco.banco + userEco.ilega;
                    cantidadEfectiva = saldoAntes;
                    userEco.cartera = 0; userEco.banco = 0; userEco.ilega = 0;
                } else {
                    saldoAntes = userEco[tipoSaldo];
                    cantidadEfectiva = Math.min(cantidad, saldoAntes);
                    userEco[tipoSaldo] = Math.max(0, userEco[tipoSaldo] - cantidad);
                }

                await userEco.save();

                responseEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🚨 FONDOS INCAUTADOS')
                    .setDescription(`Se ha procesado una remoción de capital a ${usuarioObjetivo.toString()}.`)
                    .addFields(
                        { name: `${info.emoji} Tipo: ${info.name}`, value: `\`\`\`ansi\n[0;31m- ${formatoMoneda(cantidadEfectiva)}[0m\nAntes: ${formatoMoneda(saldoAntes)}\`\`\`` },
                        { name: 'Razón Oficial', value: `\`${razon}\`` }
                    )
                    .setTimestamp();

                logEmbed = new EmbedBuilder()
                    .setColor('#CC0000')
                    .setTitle('🚨 [LOG] REMOCIÓN DE DINERO')
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: '👤 Usuario', value: usuarioObjetivo.toString(), inline: true },
                        { name: '👮 Oficial', value: interaction.user.toString(), inline: true },
                        { name: '📉 Monto', value: `\`${formatoMoneda(cantidadEfectiva)}\``, inline: true },
                        { name: '📝 Motivo', value: `\`\`\`${razon}\`\`\`` }
                    )
                    .setTimestamp();

            } else {
                // --- LÓGICA DE PURGA GLOBAL ---
                const todos = await Economia.findAll();
                let totalRemovido = 0;

                for (const user of todos) {
                    totalRemovido += (user.cartera + user.banco + user.ilega);
                    user.cartera = 0; user.banco = 0; user.ilega = 0;
                    await user.save();
                }

                responseEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('☢️ PURGA ECONÓMICA EJECUTADA')
                    .setDescription(`Se ha reseteado la economía global.\n\n**Afectados:** \`${todos.length} usuarios\`\n**Total Incautado:** \`${formatoMoneda(totalRemovido)}\`\n**Motivo:** \`${razon}\``)
                    .setFooter({ text: "Operación de limpieza de base de datos" })
                    .setTimestamp();

                logEmbed = new EmbedBuilder()
                    .setColor('#8B0000')
                    .setTitle('☢️ [LOG] PURGA GLOBAL')
                    .addFields(
                        { name: '👮 Ejecutor', value: interaction.user.toString() },
                        { name: '💸 Impacto Total', value: `\`${formatoMoneda(totalRemovido)}\`` },
                        { name: '📝 Razón', value: razon }
                    )
                    .setTimestamp();
            }

            // Enviar Logs
            const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) await logChannel.send({ embeds: [logEmbed] });

            await interaction.editReply({ embeds: [responseEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Error al intentar incautar los fondos.');
        }
    }
};