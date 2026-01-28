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
        .setName('añadir-dinero')
        .setDescription('Añade dinero a un usuario (Solo Administradores autorizados).')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres añadir dinero.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('El tipo de saldo a modificar.')
                .setRequired(true)
                .addChoices(
                    { name: '💰 Cartera', value: 'cartera' },
                    { name: '🏦 Banco', value: 'banco' },
                    { name: '💸 Ilegal', value: 'ilega' }, // Cambiado a 'ilega' para coincidir con tu modelo
                ))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de pesos a añadir.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('razon')
                .setDescription('Razón de la adición (Ej: Compensación)')
                .setRequired(true)),

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
                content: '<:4666xmark:1444377925930713240> No tienes autorización en el sistema de Hacienda para emitir divisas.', 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        const usuarioObjetivo = interaction.options.getUser('usuario');
        const tipoSaldo = interaction.options.getString('tipo');
        const cantidad = interaction.options.getInteger('cantidad');
        const razon = interaction.options.getString('razon');

        if (cantidad <= 0) {
            return interaction.reply({ content: '❌ La cantidad debe ser mayor a 0.', flags: [MessageFlags.Ephemeral] });
        }

        await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

        try {
            let userEco = await Economia.findOne({ where: { discordId: usuarioObjetivo.id } });
            if (!userEco) userEco = await Economia.create({ discordId: usuarioObjetivo.id });

            const saldoAntes = userEco[tipoSaldo];
            userEco[tipoSaldo] += cantidad;
            await userEco.save();
            const saldoDespues = userEco[tipoSaldo];

            // Emojis según el tipo
            const info = {
                cartera: { name: 'Cartera', emoji: '💰' },
                banco: { name: 'Banco', emoji: '🏦' },
                ilega: { name: 'Fondos Ilegales', emoji: '💸' }
            }[tipoSaldo];

            // -------------------------------------------------------------
            // EMBED DE CONFIRMACIÓN (Admin)
            // -------------------------------------------------------------
            const confirmEmbed = new EmbedBuilder()
                .setColor(16448250)
                .setTitle('✅ EMISIÓN COMPLETADA')
                .setDescription(`Se han inyectado fondos a la cuenta de ${usuarioObjetivo.toString()}.`)
                .setThumbnail(usuarioObjetivo.displayAvatarURL())
                .addFields(
                    { 
                        name: `${info.emoji} Saldo Modificado (${info.name})`, 
                        value: `\`\`\`ansi\n[0;32m+ ${formatoMoneda(cantidad)}[0m\nAntes: ${formatoMoneda(saldoAntes)}\nAhora: ${formatoMoneda(saldoDespues)}\`\`\``, 
                        inline: false 
                    },
                    { name: 'Razón Oficial', value: `\`${razon}\``, inline: true }
                )
                .setFooter({ text: `Registro: ${usuarioObjetivo.id}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmEmbed] });

            // -------------------------------------------------------------
            // EMBED DE LOGS (Canal de Logs)
            // -------------------------------------------------------------
            const logEmbed = new EmbedBuilder()
                .setColor('#2F3136')
                .setTitle('📜 [LOG] MOVIMIENTO ADMINISTRATIVO')
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: '👤 Beneficiario', value: usuarioObjetivo.toString(), inline: true },
                    { name: '👮 Autorizado por', value: interaction.user.toString(), inline: true },
                    { name: '💵 Monto', value: `\`${formatoMoneda(cantidad)}\``, inline: true },
                    { name: '📊 Tipo', value: `\`${info.name}\``, inline: true },
                    { name: '📝 Motivo', value: `\`\`\`${razon}\`\`\``, inline: false }
                )
                .setTimestamp();

            const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) await logChannel.send({ embeds: [logEmbed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply('❌ Fallo crítico en la transacción.');
        }
    }
};