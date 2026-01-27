const { 
    SlashCommandBuilder, 
    EmbedBuilder,
    // Componentes V2
    ContainerBuilder, 
    TextDisplayBuilder, 
    SeparatorBuilder,
    MessageFlags, // Necesario para el modo V2
    MediaGalleryBuilder,
    MediaGalleryItemBuilder
} = require('discord.js');
const fetch = require('node-fetch'); 
const Cedula = require('../models/Cedula'); 

// Carga la clave del servidor de ER:LC desde el archivo .env
require('dotenv').config();
const ERLC_SERVER_KEY = process.env.ERLC_SERVER_KEY; 
const ERLC_API_URL = 'https://api.policeroleplay.community/v1/server/command'; 

// CONSTANTES DEL BOT
const CANAL_EJECUCION_ID = '1409728378767937536'; 
const ROL_MEDICO_ID = '1427117575715688560'; 
const CANAL_STAFF_ID = '1409144997084659724'; 
const ROL_STAFF_PING = '1409090648534941757'; 

// --- EMOJIS Y CONSTANTES PERSONALIZADAS ---
const EMOJI_CHECK = '<:02:1421542330040586330>'; 
const EMOJI_ERROR = '<:Error_personalizado:1435374785419935955>'; 

// Emojis de la plantilla JSON
const EMOJI_DOC_THANKS = '<:51344thanksdocyt:1445872288926011424>';
const EMOJI_SYRINGE = '<a:784778redsyringe:1445872794750685286>';
const EMOJI_PUNTO = '<:blackpoint:1445860239969882152>';
const EMOJI_OFFLINE = '<a:9596offline:1445874456193929287>';
const EMOJI_VERIFIED = '<:26514verified:1445875150087000204>';
const EMOJI_GREEN_SIREN = '<a:5264greensiren:1445807168421888070>';
const EMOJI_HEART_ANIMADO = '<a:427771heart:1445875572461932554>';
const MEDIA_GALLERY_URL = 'https://cdn.discordapp.com/attachments/1437915183979823337/1445871635692261618/image.png?ex=6931ec64&is=69309ae4&hm=2b15c5bdf4ae50d4018a6519f603e7cd13383722c850366ddde199b1029db0a7';


/**
 * Crea el Container V2 para la respuesta de éxito (público y DM).
 * Diseño ajustado para ser más compacto y usar títulos más pequeños.
 */
const crearKitMedicoContainer = (targetUser, initiatorUser) => {
    
    const ACCENT_COLOR_MEDIC = 0x2ECC71; 
    const COMPACT_SEPARATOR = new SeparatorBuilder().setDivider(true);
    
    return new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_MEDIC) 
        
        // --- 1. IMAGEN DE CABECERA (Media Gallery) ---
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(MEDIA_GALLERY_URL)
                )
        )
        
        .addSeparatorComponents(COMPACT_SEPARATOR)
        
        // --- 2. TÍTULO PRINCIPAL (Reducido a ##) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_DOC_THANKS} SERVICIO MEDICO | .`)
        )
        
        .addSeparatorComponents(COMPACT_SEPARATOR)

        // --- 3. ESTADO Y USUARIOS (Usando ### y > para compactar) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_SYRINGE} KIT MEDICO APLICADO CORRECTAMENTE.\n` + 
                `> ${EMOJI_PUNTO} SERVICIO MEDICO EJECUTADO POR: <@${initiatorUser.id}>\n` +
                `> ${EMOJI_PUNTO} JUGADOR CURADO: <@${targetUser.id}>`
            )
        )
        
        .addSeparatorComponents(COMPACT_SEPARATOR)
        
        // --- 4. ESTADO DEL KIT (Consumido) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_DOC_THANKS} | ESTADO DEL KIT MEDICO.\n` + 
                `> ${EMOJI_OFFLINE} \`CONSUMIDO\` | (*ROL MEDICO RETIRADO*) ${EMOJI_VERIFIED}.`
            )
        )
        
        .addSeparatorComponents(COMPACT_SEPARATOR)
        
        // --- 5. LÍNEA DE ROL (Reducido a ###) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${EMOJI_GREEN_SIREN} EL JUGADOR PUEDE ROLEAR NUEVAMENTE ${EMOJI_HEART_ANIMADO}`)
        )

        .addSeparatorComponents(COMPACT_SEPARATOR)
        
        // --- 6. FOOTER (Reducido a ###) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### *[BGC] BOGOTA, COLOMBIA RP | SISTEMA MEDICO* ${EMOJI_DOC_THANKS}`)
        );
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('kit-medico')
        .setDescription('Usa el kit médico para curar a un jugador muerto usando la API de ER:LC.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('El usuario que va a ser curado.')
                .setRequired(true)),
        
    async execute(interaction) {
        
        // Deferir la respuesta de forma privada
        await interaction.deferReply({ ephemeral: true }); 
        
        const targetUser = interaction.options.getUser('usuario');
        const initiatorMember = interaction.member;
        
        // 1. VERIFICACIONES PREVIAS Y CONFIGURACIÓN
        if (!ERLC_SERVER_KEY || ERLC_SERVER_KEY === 'YOUR_RLC_SERVER_KEY_HERE') {
            return interaction.editReply({ 
                content: `${EMOJI_ERROR} **Error de configuración:** La clave del servidor de ER:LC no está configurada en el archivo \`.env\`.` 
            });
        }
        
        if (interaction.channelId !== CANAL_EJECUCION_ID) {
            return interaction.editReply({ 
                content: `${EMOJI_ERROR} | Este comando solo se puede ejecutar en el canal autorizado (<#${CANAL_EJECUCION_ID}>).` 
            });
        }

        if (!initiatorMember.roles.cache.has(ROL_MEDICO_ID)) {
             return interaction.editReply({ 
                content: `${EMOJI_ERROR} | Solo los usuarios con el rol **KIT MEDICO** pueden usar este comando. El rol se consume al usarlo.` 
            });
        }

        // 2. OBTENER NICK DE ROBLOX
        const cedulaData = await Cedula.findOne({
            where: { discordId: targetUser.id }
        });

        const robloxUsername = cedulaData ? cedulaData.usuarioRoblox : null; 

        if (!robloxUsername) {
            return interaction.editReply({
                content: `${EMOJI_ERROR} | El usuario **<@${targetUser.id}>** no tiene un nombre de usuario de Roblox asociado en la base de datos de Cédulas. No se puede curar.`
            });
        }
        
        // 3. LLAMADA A LA API DE ER:LC (ACCIÓN DE HEAL)
        let apiSuccess = false;
        let apiResponse = 'Error desconocido en la API.';
        const commandToExecute = `:heal ${robloxUsername}`; 

        try {
            const requestBody = JSON.stringify({
                command: commandToExecute 
            });

            const apiCall = await fetch(ERLC_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Server-Key': ERLC_SERVER_KEY 
                },
                body: requestBody
            });

            if (!apiCall.ok) {
                 apiResponse = `Código: ${apiCall.status}`;
                 try {
                     const errorData = await apiCall.json();
                     apiResponse += `\nMensaje: ${errorData.message || 'Error sin mensaje'}`;
                 } catch (e) {
                     apiResponse += '\nNo se pudo obtener el mensaje de error detallado de la API.';
                 }
            } else {
                const data = await apiCall.json();
                apiSuccess = true;
                apiResponse = data.message || `Comando '${commandToExecute}' enviado con éxito.`;
            }

        } catch (error) {
            console.error(`[KIT MEDICO - API] Error de red al llamar a la API:`, error);
            apiResponse = `Error de conexión: ${error.message}`;
        }
        
        // 4. MANEJO DE FALLO CRÍTICO DE API
        if (!apiSuccess) {
            const failEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle(`${EMOJI_ERROR} Fallo en la Ejecución Médica`)
                .setDescription(`El jugador **${robloxUsername}** no pudo ser curado automáticamente y tu kit no fue consumido.`)
                .addFields(
                    { name: 'Detalle del Error', value: `\`\`\`${apiResponse}\`\`\``, inline: false }
                )
                .setFooter({ text: 'Error de conexión o de la API de ER:LC' });
                
            const errorLogEmbed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🚨 ERROR EN KIT MÉDICO (LOG)')
                .addFields(
                    { name: 'Médico', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Usuario Roblox', value: `\`${robloxUsername}\``, inline: true },
                    { name: 'Error API', value: `\`\`\`\n${apiResponse}\n\`\`\``, inline: false }
                )
                .setTimestamp()
                .setFooter({ text: 'Log de Fallo API' });
                
            const logChannel = interaction.client.channels.cache.get(CANAL_STAFF_ID);
            if (logChannel) {
                await logChannel.send({ embeds: [errorLogEmbed] }); 
            }

            return interaction.editReply({ embeds: [failEmbed], components: [], flags: 0 });
        }

        // 5. PROCESO DE USO Y CONSUMO DE ROL
        try {
            await initiatorMember.roles.remove(ROL_MEDICO_ID);
        } catch (error) {
            console.error(`[KIT MEDICO] Error al quitar el rol ${ROL_MEDICO_ID} a ${initiatorMember.user.tag}:`, error);
        }

        // 6. RESPUESTA EPHEMERAL EXITOSA (USANDO EL NUEVO DISEÑO V2 COMPACTO)
        const confirmationContainer = crearKitMedicoContainer(targetUser, interaction.user);
            
        await interaction.editReply({ 
            components: [confirmationContainer],
            flags: MessageFlags.IsComponentsV2,
            embeds: []
        });


        // 7. CREACIÓN Y ENVÍO DE CONTAINERS (Público y DMs)
        
        // Container Público/DM
        const publicContainer = crearKitMedicoContainer(targetUser, interaction.user);
            
        // 8. ENVÍO DE MENSAJES PÚBLICOS/LOGS
        
        // Envío Público
        await interaction.channel.send({
             components: [publicContainer],
             flags: MessageFlags.IsComponentsV2,
             content: ''
        });

        // Envío por DM al curado
        targetUser.send({ 
            components: [publicContainer],
            flags: MessageFlags.IsComponentsV2,
            content: ''
        })
            .catch(() => console.log(`[KIT MEDICO] No se pudo enviar DM a ${targetUser.tag}`));
        
        // Log de Staff (Mantenido con EmbedBuilder)
        const staffEmbed = new EmbedBuilder()
            .setColor('#2ECC71')
            .setTitle('📝 REGISTRO DE COMANDO EJECUTADO (KIT MÉDICO)')
            .setDescription(`Comando API ejecutado: \`${commandToExecute}\``)
            .addFields(
                { 
                    name: 'Médico', 
                    value: `<@${interaction.user.id}> (\`${interaction.user.tag}\`)`, 
                    inline: true 
                },
                { 
                    name: 'Paciente', 
                    value: `<@${targetUser.id}> (\`${targetUser.tag}\`)`, 
                    inline: true 
                },
                { 
                    name: 'Usuario Roblox', 
                    value: `\`\`\`${robloxUsername}\`\`\``, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: `Log automático. Rol consumido.` });
            
        const logChannel = interaction.client.channels.cache.get(CANAL_STAFF_ID);
        if (logChannel) {
            await logChannel.send({
                embeds: [staffEmbed]
            });
        }
    }
};