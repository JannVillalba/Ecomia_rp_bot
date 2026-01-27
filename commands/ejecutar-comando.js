const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fetch = require('node-fetch');

// Carga tu clave de la API desde el archivo .env
require('dotenv').config();
const ERLC_SERVER_KEY = process.env.ERLC_SERVER_KEY;
const ROL_AUTORIZADO = '1409090648534941757';
const CANAL_LOGS = '1413752821324709918';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ejecutar-comando')
        .setDescription('Ejecuta un comando en el servidor de ER:LC a través de la API.')
        .addStringOption(option =>
            option.setName('comando')
            .setDescription('El comando a ejecutar (ej: kick <ID>).')
            .setRequired(true)),
    
    async execute(interaction) {
        // --- 1. Verificación de Roles ---
        if (!interaction.member.roles.cache.has(ROL_AUTORIZADO)) {
            return interaction.reply({ content: '❌ No tienes el rol autorizado para usar este comando.', flags: MessageFlags.Ephemeral });
        }

        // --- 2. Verificación de la Clave de la API ---
        if (!ERLC_SERVER_KEY || ERLC_SERVER_KEY === 'YOUR_RLC_SERVER_KEY_HERE') {
            return interaction.reply({ 
                content: '❌ **Error de configuración:** La clave del servidor de ER:LC no está configurada en el archivo `.env`.', 
                flags: MessageFlags.Ephemeral 
            });
        }

        const commandString = interaction.options.getString('comando');
        
        // --- 3. Embed de Carga ---
        const loadingEmbed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setDescription(`💬 Enviando comando: \`${commandString}\` a la API de ER:LC...`);
        
        await interaction.reply({ embeds: [loadingEmbed], flags: MessageFlags.Ephemeral });

        try {
            const url = 'https://api.policeroleplay.community/v1/server/command';

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Server-Key': ERLC_SERVER_KEY
                },
                body: JSON.stringify({
                    command: commandString
                })
            });

            if (!response.ok) {
                let errorDetails = `Código: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails += `\nMensaje: ${errorData.message}`;
                } catch (e) {
                    errorDetails += '\nNo se pudo obtener el mensaje de error de la API.';
                }
                
                console.error(`Error de la API de ER:LC: ${errorDetails}`);
                
                // Registro de error en el canal de logs
                const errorLogEmbed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🚨 ERROR AL EJECUTAR COMANDO')
                    .addFields(
                        { name: 'Oficial', value: `<@${interaction.user.id}>`, inline: true },
                        { name: 'Comando', value: `\`${commandString}\``, inline: true },
                        { name: 'Detalles del Error', value: `\`\`\`\n${errorDetails}\n\`\`\``, inline: false }
                    )
                    .setTimestamp()
                    .setFooter({ text: 'Sistema de Log de Comandos' });
                
                const logChannel = interaction.client.channels.cache.get(CANAL_LOGS);
                if (logChannel) {
                    await logChannel.send({ embeds: [errorLogEmbed] });
                }

                return interaction.editReply({
                    content: `❌ Hubo un error al ejecutar el comando. Por favor, verifica el comando y los permisos de la clave de la API.`,
                    embeds: []
                });
            }

            // Si la respuesta es exitosa
            const successEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('✅ Comando Ejecutado')
                .addFields(
                    { name: 'Oficial Responsable', value: `<@${interaction.user.id}>` },
                    { name: 'Comando Enviado', value: `\`${commandString}\`` }
                )
                .setTimestamp()
                .setFooter({ text: 'Operación Exitosa' });
            
            // Envío del registro de logs
            const logEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('📝 REGISTRO DE COMANDO EJECUTADO')
                .addFields(
                    { name: 'Oficial', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Comando', value: `\`${commandString}\``, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Sistema de Log de Comandos' });

            const logChannel = interaction.client.channels.cache.get(CANAL_LOGS);
            if (logChannel) {
                await logChannel.send({ embeds: [logEmbed] });
            }

            return interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('[Error en Comando ejecutar-comando]:', error);
            return interaction.editReply({ content: '❌ Ocurrió un error inesperado al procesar la solicitud.' });
        }
    }
};