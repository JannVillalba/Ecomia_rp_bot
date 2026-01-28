const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Economia = require('../models/Economia');

// ID del rol que puede ejecutar el comando (tu rol de Admin)
const ADMIN_ROLE_ID = '1409090648534941757';
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
        .setName('remover-dinero')
        .setDescription('Remueve dinero de la cartera, banco o fondos ilegales de un usuario o todos.')
        .addStringOption(option =>
            option.setName('tipo')
                .setDescription('El tipo de saldo a remover.')
                .setRequired(true)
                .addChoices(
                    { name: '💰 Cartera', value: 'cartera' },
                    { name: '🏦 Banco', value: 'banco' },
                    { name: '💸 Ilegal', value: 'ilegal' },
                    { name: '💥 TODO (Purga)', value: 'todo' },
                ))
        .addStringOption(option => // <-- OPCIÓN REQUERIDA MOVIDA AQUÍ
            option.setName('razon')
                .setDescription('Razón de la remoción de dinero.')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres remover dinero. (Opcional, si no se especifica se remueve a todos).')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a remover. (Solo si no es "todo").')
                .setRequired(false)),
    async execute(interaction) {
        // Verificar si el usuario tiene el rol de administrador
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.reply({ content: '❌ No tienes permisos para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        const tipoSaldo = interaction.options.getString('tipo');
        const usuarioObjetivo = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');
        const razon = interaction.options.getString('razon');

        // Validaciones: Si no es 'todo', la cantidad debe ser válida y debe haber un usuario objetivo.
        if (tipoSaldo !== 'todo') {
            if (cantidad === null || cantidad <= 0) {
                return interaction.reply({ content: '❌ Debes especificar una cantidad válida (mayor que 0) para remover.', flags: MessageFlags.Ephemeral });
            }
            if (!usuarioObjetivo) {
                 return interaction.reply({ content: '❌ Para remover una cantidad específica, debes especificar un usuario objetivo.', flags: MessageFlags.Ephemeral });
            }
        }
        
        // Respuesta efímera a menos que sea una purga global.
        await interaction.deferReply({ flags: !usuarioObjetivo && tipoSaldo === 'todo' ? undefined : MessageFlags.Ephemeral }); 

        let responseEmbed;
        let logEmbed;
        let tipoEmoji;
        let tipoString;

        try {
            if (usuarioObjetivo) {
                // Lógica para un solo usuario
                let usuarioEconomia = await Economia.findOne({ where: { discordId: usuarioObjetivo.id } });
                if (!usuarioEconomia) {
                    return interaction.editReply(`❌ El usuario **${usuarioObjetivo.tag}** no tiene una cuenta de economía.`);
                }
                
                let saldoAntes;
                let cantidadRemovida;
                
                if (tipoSaldo === 'cartera') {
                    saldoAntes = usuarioEconomia.cartera;
                    cantidadRemovida = Math.min(cantidad, saldoAntes);
                    usuarioEconomia.cartera = Math.max(0, usuarioEconomia.cartera - cantidad);
                    tipoString = 'Cartera';
                    tipoEmoji = '💰';
                } else if (tipoSaldo === 'banco') {
                    saldoAntes = usuarioEconomia.banco;
                    cantidadRemovida = Math.min(cantidad, saldoAntes);
                    usuarioEconomia.banco = Math.max(0, usuarioEconomia.banco - cantidad);
                    tipoString = 'Banco';
                    tipoEmoji = '🏦';
                } else if (tipoSaldo === 'ilegal') {
                    saldoAntes = usuarioEconomia.ilegal;
                    cantidadRemovida = Math.min(cantidad, saldoAntes);
                    usuarioEconomia.ilegal = Math.max(0, usuarioEconomia.ilegal - cantidad);
                    tipoString = 'Fondos Ilegales';
                    tipoEmoji = '💸';
                } else if (tipoSaldo === 'todo') {
                    saldoAntes = usuarioEconomia.cartera + usuarioEconomia.banco + usuarioEconomia.ilegal;
                    cantidadRemovida = saldoAntes;
                    usuarioEconomia.cartera = 0;
                    usuarioEconomia.banco = 0;
                    usuarioEconomia.ilegal = 0;
                    tipoString = 'TODO el dinero';
                    tipoEmoji = '💥';
                }
                
                await usuarioEconomia.save();
                
                const saldoTotalDespues = usuarioEconomia.cartera + usuarioEconomia.banco + usuarioEconomia.ilegal;
                
                // EMBED DE RESPUESTA (para el Administrador)
                responseEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('💸 Dinero Removido Exitosamente')
                    .setDescription(`Se ha removido dinero a ${usuarioObjetivo.toString()}.`)
                    .setThumbnail(usuarioObjetivo.displayAvatarURL())
                    .addFields(
                        { 
                            name: `${tipoEmoji} Saldo Modificado (${tipoString})`, 
                            value: `\`\`\`ansi\n[0;31m- ${formatoMoneda(cantidadRemovida)}[0m\nAntes: ${formatoMoneda(saldoAntes)}\`\`\``, 
                            inline: false 
                        },
                        { name: 'Saldo Total Restante', value: formatoMoneda(saldoTotalDespues), inline: true },
                        { name: 'Razón Oficial', value: `\`${razon}\``, inline: true }
                    )
                    .setFooter({ text: `ID Usuario: ${usuarioObjetivo.id}` })
                    .setTimestamp();
                    
                // EMBED DE LOGS (para el canal de logs)
                logEmbed = new EmbedBuilder()
                    .setColor('#CC0000') 
                    .setTitle('🚨 [LOG] DINERO REMOVIDO')
                    .setDescription('Registro de una transacción administrativa de remoción de dinero.')
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: '👤 Usuario Afectado', value: usuarioObjetivo.toString(), inline: true },
                        { name: '👮 Administrador', value: interaction.user.toString(), inline: true },
                        { name: '\u200b', value: '\u200b', inline: true }, 
                        { 
                            name: `${tipoEmoji} Tipo de Saldo`, 
                            value: `\`${tipoString}\``, 
                            inline: true 
                        },
                        { 
                            name: '➖ Cantidad Removida', 
                            value: `\`\`\`ansi\n[0;31m- ${formatoMoneda(cantidadRemovida)}[0m\`\`\``, 
                            inline: true 
                        },
                        { 
                            name: '📊 Saldo Después', 
                            value: `\`${formatoMoneda(saldoTotalDespues)}\``, 
                            inline: true 
                        },
                        { name: '📝 Razón Completa', value: `\`\`\`${razon}\`\`\``, inline: false }
                    )
                    .setTimestamp();

            } else {
                // Lógica para todos los usuarios (Purga Global)
                const usuariosEconomia = await Economia.findAll();
                let totalRemovido = 0;

                for (const user of usuariosEconomia) {
                    totalRemovido += user.cartera + user.banco + user.ilegal;
                    user.cartera = 0;
                    user.banco = 0;
                    user.ilegal = 0;
                    await user.save();
                }

                // EMBED DE RESPUESTA (PÚBLICA)
                responseEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('🚨 PURGA DE ECONOMÍA GLOBAL EJECUTADA 🚨')
                    .setDescription(`
                        El oficial <@${interaction.user.id}> ha iniciado una **Purga Global de Economía**.
                        
                        **Acción:** Se ha removido **TODO** el dinero de **TODOS** los balances.
                        
                        \`\`\`
                        Total Usuarios Afectados: ${usuariosEconomia.length}
                        Total Estimado Removido: ${formatoMoneda(totalRemovido)}
                        \`\`\`
                        
                        **Razón:** \`${razon}\`
                    `)
                    .setTimestamp();

                // EMBED DE LOGS (para el canal de logs)
                logEmbed = new EmbedBuilder()
                    .setColor('#8B0000') 
                    .setTitle('☢️ [LOG] PURGA GLOBAL DE ECONOMÍA')
                    .setDescription('Registro de la remoción total de la economía del servidor.')
                    .setAuthor({ name: interaction.user.tag, iconURL: interaction.user.displayAvatarURL() })
                    .addFields(
                        { name: '👮 Administrador Ejecutor', value: interaction.user.toString(), inline: true },
                        { name: '👥 Usuarios Afectados', value: `${usuariosEconomia.length}`, inline: true },
                        { name: '\u200b', value: '\u200b', inline: true },
                        { 
                            name: '💸 Total Removido', 
                            value: `\`\`\`ansi\n[0;31m${formatoMoneda(totalRemovido)}[0m\`\`\``, 
                            inline: false 
                        },
                        { name: '📝 Razón Oficial', value: `\`\`\`${razon}\`\`\``, inline: false }
                    )
                    .setTimestamp();
            }

            // Enviar el embed al canal de logs
            const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            } else {
                console.error(`Error: No se encontró el canal de logs con el ID ${LOG_CHANNEL_ID}`);
            }

            // Editar la respuesta de la interacción
            await interaction.editReply({ embeds: [responseEmbed] });

        } catch (error) {
            console.error('Error al remover dinero:', error);
            await interaction.editReply('❌ Ocurrió un error al intentar remover el dinero.');
        }
    }
};