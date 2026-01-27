const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Economia = require('../models/Economia');

// ID del rol que puede ejecutar el comando (tu rol de Admin)
const ADMIN_ROLE_ID = '1461779864330703088';
// ID del canal para los logs
const LOG_CHANNEL_ID = '1409091022436171786';

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('añadir-dinero')
        .setDescription('Añade dinero a la cartera, banco o fondos ilegales de un usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres añadir dinero.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('El tipo de saldo a modificar (cartera, banco, ilegal).')
                .setRequired(true)
                .addChoices(
                    { name: '💰 Cartera', value: 'cartera' },
                    { name: '🏦 Banco', value: 'banco' },
                    { name: '💸 Ilegal', value: 'ilegal' },
                ))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a añadir. Debe ser un número positivo.')
                .setRequired(true))
        .addStringOption(option => // <-- Nuevo campo para la razón
            option.setName('razon')
                .setDescription('Razón de la adición de dinero (ej: "Compensación por error").')
                .setRequired(true)),
    async execute(interaction) {
        // Verificar si el usuario tiene el rol de administrador
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            await interaction.reply({ content: '❌ No tienes permisos para usar este comando.', flags: MessageFlags.Ephemeral });
            return;
        }

        const usuarioObjetivo = interaction.options.getUser('usuario');
        const tipoSaldo = interaction.options.getString('tipo');
        const cantidad = interaction.options.getInteger('cantidad');
        const razon = interaction.options.getString('razon'); // <-- Obtener la razón

        if (cantidad <= 0) {
            await interaction.reply({ content: '❌ La cantidad debe ser un número mayor que 0.', flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Respuesta inicial solo visible para el admin
        }

        let logEmbed; // Usaremos esto para el log
        let tipoString;
        let tipoEmoji;

        try {
            // Buscar o crear el registro de economía del usuario
            let usuarioEconomia = await Economia.findOne({ where: { discordId: usuarioObjetivo.id } });
            if (!usuarioEconomia) {
                usuarioEconomia = await Economia.create({ discordId: usuarioObjetivo.id });
            }

            // Actualizar el saldo según el tipo
            let saldoAntes;
            let saldoDespues;
            
            if (tipoSaldo === 'cartera') {
                saldoAntes = usuarioEconomia.cartera;
                usuarioEconomia.cartera += cantidad;
                saldoDespues = usuarioEconomia.cartera;
                tipoString = 'Cartera';
                tipoEmoji = '💰';
            } else if (tipoSaldo === 'banco') {
                saldoAntes = usuarioEconomia.banco;
                usuarioEconomia.banco += cantidad;
                saldoDespues = usuarioEconomia.banco;
                tipoString = 'Banco';
                tipoEmoji = '🏦';
            } else if (tipoSaldo === 'ilegal') {
                saldoAntes = usuarioEconomia.ilegal;
                usuarioEconomia.ilegal += cantidad;
                saldoDespues = usuarioEconomia.ilegal;
                tipoString = 'Fondos Ilegales';
                tipoEmoji = '💸';
            } else {
                return interaction.editReply('❌ Tipo de saldo no válido.');
            }

            await usuarioEconomia.save();
            
            // -------------------------------------------------------------
            //      EMBED DE CONFIRMACIÓN (para el Administrador)
            // -------------------------------------------------------------
            const confirmationEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Operación Exitosa')
                .setDescription(`Se ha añadido dinero a ${usuarioObjetivo.toString()}.`)
                .setThumbnail(usuarioObjetivo.displayAvatarURL())
                .addFields(
                    { 
                        name: `${tipoEmoji} Saldo Modificado (${tipoString})`, 
                        value: `\`\`\`ansi\n[0;32m+ ${formatoMoneda(cantidad)}[0m\nAntes: ${formatoMoneda(saldoAntes)}\nAhora: ${formatoMoneda(saldoDespues)}\`\`\``, 
                        inline: false 
                    },
                    { name: 'Oficial Administrativo', value: interaction.user.toString(), inline: true },
                    { name: 'Razón Oficial', value: `\`${razon}\``, inline: true }
                )
                .setFooter({ text: `ID Usuario: ${usuarioObjetivo.id}` })
                .setTimestamp();

            await interaction.editReply({ embeds: [confirmationEmbed] });


            // -------------------------------------------------------------
            //      EMBED DE LOGS (para el canal de logs)
            // -------------------------------------------------------------
            logEmbed = new EmbedBuilder()
                .setColor('#0099ff')
                .setTitle('📜 [LOG] DINERO AÑADIDO')
                .setDescription('Registro de una transacción administrativa de adición de dinero.')
                .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                .addFields(
                    { name: '👤 Usuario Afectado', value: usuarioObjetivo.toString(), inline: true },
                    { name: '👮 Administrador', value: interaction.user.toString(), inline: true },
                    { name: '\u200b', value: '\u200b', inline: true }, // Campo vacío para separar
                    { 
                        name: `${tipoEmoji} Tipo de Saldo Modificado`, 
                        value: `\`${tipoString}\``, 
                        inline: true 
                    },
                    { 
                        name: '💵 Cantidad', 
                        value: `\`\`\`ansi\n[0;32m+ ${formatoMoneda(cantidad)}[0m\`\`\``, 
                        inline: true 
                    },
                    { 
                        name: '📊 Saldo Después', 
                        value: `\`${formatoMoneda(saldoDespues)}\``, 
                        inline: true 
                    },
                    { name: '📝 Razón Completa', value: `\`\`\`${razon}\`\`\``, inline: false }
                )
                .setTimestamp();
            

            // Enviar el embed al canal de logs
            const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            } else {
                console.error(`Error: No se encontró el canal de logs con el ID ${LOG_CHANNEL_ID}`);
            }

        } catch (error) {
            console.error('Error al añadir dinero:', error);
            await interaction.editReply('❌ Ocurrió un error al intentar añadir el dinero.');
        }
    }
};