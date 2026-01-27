const { 
    SlashCommandBuilder,
    MessageFlags,
    PermissionFlagsBits 
} = require('discord.js');

// --- CONSTANTES DE CONFIGURACIÓN DE MÉXICO NUEVO LAREDO [ER:LC] ---
const STAFF_ROLE_ID = '1409090648534941757'; // ID de Staff de México Nuevo Laredo [ER:LC]
const CUSTOM_ICON_URL = 'https://cdn.discordapp.com/avatars/1409651745403044011/d5e3a824c8d75b0a4e787fdce0dd587a.png?size=2048'; // URL del ícono/avatar del bot
const DEFAULT_SUPPORT_URL = 'https://discord.com/channels/1406822099401703504/1409090880412844095'; // URL del canal de soporte
const DEFAULT_WAIT_TIME = 10; // Tiempo de espera en minutos (del nuevo JSON visual)

// --- EMOJIS (IDs de México Nuevo Laredo [ER:LC]) ---
const EMOJI_EXCLAMATION_RED = '<a:7732exclamationred:1447021112495181864>';
const EMOJI_ARROW_ANIMATED = '<a:3292arrowanimated:1447021118715068487>';
const EMOJI_PEN_AND_PAPER = '<a:papelylapiz:1445861826792259669>';
const EMOJI_COLOMBIA = '<:Colombia_BGC:1442175241014218923>';
const EMOJI_WEEWOO_RED = '<a:9892weewoored:1445807417651757208>';

// --- FUNCIÓN DE LOGGING (Para errores privados en consola) ---
function logBox(title, message, type) {
    const border = '═'.repeat(48);
    let logType = '';
    
    if (type === 'ERROR') logType = '❌ Error Comando';
    else if (type === 'INFO') logType = '🚨 INFO Soporte';
    else logType = '⚠️ Log';
    
    console.log(`\n╔${border}╗`);
    console.log(`║ ${logType.padEnd(46)} ║`);
    console.log(`║ ${title}: ${message.padEnd(46 - title.length - 2)} ║`);
    console.log(`╚${border}╝`);
}

// --- PLANTILLA DEL MENSAJE V2 (BASADO EN EL NUEVO JSON VISUAL) ---
const RAW_SUPPORT_MESSAGE_TEMPLATE = {
    "flags": MessageFlags.IsComponentsV2, // 32768
    "components": [
        {
            "type": 17,
            "components": [
                {
                    "type": 9, // Título y Mención
                    "components": [
                        {
                            "type": 10,
                            "content": `# ${EMOJI_EXCLAMATION_RED} Has Sido Citado a Soporte, [USER_MENTION_INJECT]`
                        }
                    ],
                    "accessory": {
                        "type": 11,
                        "media": {
                            "url": CUSTOM_ICON_URL
                        },
                        "description": "Server Icon"
                    }
                },
                { "type": 14 },
                {
                    "type": 9, // Información de Soporte
                    "components": [
                        {
                            "type": 10,
                            "content": `## ${EMOJI_ARROW_ANIMATED} INFORMACION DEL SOPORTE:\n[CONTENT_REPLACE]` // Marcador
                        }
                    ],
                    "accessory": {
                        "type": 2, // Botón Link
                        "style": 5, 
                        "label": "Espera Soporte",
                        "emoji": {
                            "id": "1447021118715068487",
                            "name": "3292arrowanimated",
                            "animated": true
                        },
                        "url": "SUPPORT_CHANNEL_URL_REPLACE" // Marcador
                    }
                },
                { "type": 14 },
                {
                    "type": 10, // Footer de Reglas
                    "content": `${EMOJI_WEEWOO_RED} Ten Esto en Cuenta.\n- Tienes: ***${DEFAULT_WAIT_TIME} minutos***, para ingresar al soporte de lo contrario se te sancionara por evadir soporte.\n- Presenta las pruebas que el staff te solicite para resolver el problema rapidamente.`
                },
                { "type": 14 }
            ]
        }
    ]
};


// =========================================================================
// DEFINICIÓN DE DATA 
// =========================================================================

const supportCommandData = new SlashCommandBuilder()
    .setName('soporte')
    .setDescription('Llama a un usuario para iniciar una sesión de soporte (Solo Staff).')
    .addUserOption(option =>
        option.setName('usuario')
            .setDescription('Usuario que debe ingresar a soporte.')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('motivo')
            .setDescription('Motivo de la llamada a soporte.')
            .setRequired(true))
    // Restringir el uso del comando solo a miembros con el rol STAFF
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers) 
    .setDMPermission(false);


// =========================================================================
// EXPORTACIÓN FINAL DEL MÓDULO
// =========================================================================
module.exports = {
    data: supportCommandData, 
    
    async execute(interaction) {

        // Deferir la respuesta es lo primero, siempre público
        await interaction.deferReply(); 
        
        // --- 0. VALIDACIÓN DE PERMISOS ---
        if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
            // Usamos editReply porque ya se hizo deferReply
            return interaction.editReply({
                content: "❌ **Acceso denegado.** Solo el personal de Staff puede usar este comando.",
                flags: MessageFlags.Ephemeral // La respuesta de error es efímera
            });
        }

        // --- 1. RECOLECCIÓN DE DATOS ---
        const userToCall = interaction.options.getUser('usuario');
        const motive = interaction.options.getString('motivo');
        
        const staffMention = interaction.user.toString();
        const userMention = userToCall.toString();
        
        const supportUrl = DEFAULT_SUPPORT_URL; 
        // Cálculo del timestamp de límite (en segundos)
        const limitTimestamp = Math.floor((Date.now() / 1000) + (DEFAULT_WAIT_TIME * 60));
        
        
        // --- 2. PREPARACIÓN DEL MENSAJE USANDO COMPONENTS V2 ---
        const messageData = JSON.parse(JSON.stringify(RAW_SUPPORT_MESSAGE_TEMPLATE));
        const containerComponents = messageData.components[0].components;

        // a. Inyectar la Mención del Usuario en el Título (Primer Type 9)
        const titleComponent = containerComponents.find(c => c.type === 9 && c.components[0].content.includes('Has Sido Citado'));
        if (titleComponent) {
            // Inyección dentro del content del componente V2
            titleComponent.components[0].content = `# ${EMOJI_EXCLAMATION_RED} Has Sido Citado a Soporte, ${userMention}`;
        } else {
             logBox("Error V2", "Fallo al encontrar el componente de título para inyectar la mención.", "ERROR");
        }

        // b. Inyectar URL del Botón (Segundo Type 9, con el accessory Type 2)
        const supportInfoComponent = containerComponents.find(c => c.type === 9 && c.accessory && c.accessory.type === 2);
        if (supportInfoComponent && supportInfoComponent.accessory) {
             supportInfoComponent.accessory.url = supportUrl;
             delete supportInfoComponent.accessory.custom_id;
        } else {
             logBox("Error V2", "Fallo al encontrar el componente de botón para inyectar la URL.", "ERROR");
        }
        
        // c. Inyectar el Contenido de texto (type: 10 dentro del segundo type: 9)
        const contentComponent = supportInfoComponent.components.find(c => c.type === 10);
        
        if (contentComponent) {
             // Inyectamos todos los datos formateados en el componente de texto.
             contentComponent.content = 
                `## ${EMOJI_ARROW_ANIMATED} INFORMACION DEL SOPORTE:\n` +
                `> ${EMOJI_PEN_AND_PAPER} **MOTIVO:** \`\`\`${motive}\`\`\`\n` +
                `> ${EMOJI_COLOMBIA} **STAFF:** ${staffMention}\n` +
                `> <:44294ticking:1445520546132394087> **TIEMPO LÍMITE:** <t:${limitTimestamp}:R>\n`;

        } else {
             logBox("Error V2", "No se encontró el componente de texto de contenido (type: 10) de soporte.", "ERROR");
        }

        // --- 3. ENVÍO DEL MENSAJE ---
        try {
             // Enviamos el mensaje con la estructura V2, sin usar el campo 'content'
             await interaction.editReply({
                ...messageData,
                // 🚨 CORRECCIÓN: Se elimina el campo 'content' que causaba el error.
                // La mención está dentro de la estructura V2.
                // Se asegura que solo se mencione al usuario (y no roles).
                allowedMentions: { users: [userToCall.id], parse: [] } 
             });
             
             logBox("Soporte Iniciado", `Llamada a ${userToCall.tag} por ${interaction.user.tag}`, "INFO");
             
             return;

        } catch (error) {
            logBox("Error Soporte V2", `Fallo al enviar el mensaje de soporte: ${error.message}`, "ERROR");
            
            return interaction.editReply(`❌ Error crítico al iniciar la llamada a soporte. Contacte a un desarrollador.`)
        }
    }
};