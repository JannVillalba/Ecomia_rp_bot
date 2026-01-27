const {
    SlashCommandBuilder,
    EmbedBuilder, // Mantener si necesitas la clase, pero usaremos ContainerBuilder
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
} = require('discord.js');
const Economia = require('../models/Economia');
const config = require('../config.json');

// --- EMOJIS PERSONALIZADOS ---
const EMOJI_DINERO = '<a:72389moneywings:1445094681418399917>'; // Dinero u efectivo
const EMOJI_BANCO = '<:banco:1413691028497764463>'; // Banco (requiere ID correcto o nombre)
const EMOJI_COOLDOWN = '<:44294ticking:1445520546132394087>'; // Cooldown
const EMOJI_INGRESO = '<:238591money:1445520558254067884>'; // Ingreso
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';

// --- CONFIGURACIÓN DE CANAL ---
const CANAL_PERMITIDO = '1460692332545310813'; // ID del canal de Bancolombia

// Un Map para guardar los cooldowns por usuario y por rol
const cooldowns = new Map();

// --- Funciones de Utilidad (SIN CAMBIOS) ---
const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cantidad);
};

const tiempoACooldown = (tiempo, unidad) => {
    switch (unidad) {
        case 'minutos':
            return tiempo * 60 * 1000;
        case 'horas':
            return tiempo * 60 * 60 * 1000;
        case 'dias':
            return tiempo * 24 * 60 * 60 * 1000;
        default:
            return 0;
    }
};

// ---------------------------------------------------
// CONSTRUCTOR V2 (ACTUALIZADO CON EMOJIS Y CORRECCIÓN)
// ---------------------------------------------------
function buildCobrarContainer(interaction, totalGanado, balance, pagados, cooldowns) { 
    const color = totalGanado > 0 ? 0x1f8b4c : 0xE74C3C; // Verde o Rojo
    
    // Contenido general
    let mainContent = `## ${EMOJI_DINERO} Extracto de Pagos\n`; // Usamos EMOJI_DINERO
    mainContent += `**Usuario:** ${interaction.user.tag}\n`;
    mainContent += `*Generado el: ${new Date().toLocaleTimeString('es-CO')}*\n\n`; // Añadimos 'es-CO' para consistencia

    // 1. Bloques de Resumen
    const resumenContainer = new ContainerBuilder()
        .setAccentColor(color)
        
        // --- Bloque 1: Título y Datos Generales ---
        .addTextDisplayComponents(
            new TextDisplayBuilder()
                .setContent(mainContent)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(2).setDivider(true));

    // --- Bloque 2: Pagos Recibidos ---
    if (pagados.length > 0) {
        resumenContainer
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### ${EMOJI_CHECK} Pagos Recibidos (${pagados.length})\n` + pagados.join('\n')) // Usamos EMOJI_CHECK
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false));
    }

    // --- Bloque 3: Roles en Cooldown ---
    if (cooldowns.length > 0) {
        resumenContainer
            .addTextDisplayComponents(
                new TextDisplayBuilder()
                    .setContent(`### ${EMOJI_COOLDOWN} En Cooldown (${cooldowns.length})\n` + cooldowns.join('\n')) // Usamos EMOJI_COOLDOWN
            )
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(2).setDivider(true));
    }
    
    // --- Bloque 4: Totales Finales ---
    let footerContent = '';
    
    // Ganancia Total
    footerContent += `## ${EMOJI_INGRESO} Ingreso Total\n`; // Usamos EMOJI_INGRESO
    // Usar totalGanado
    footerContent += `\`\`\`ansi\n[0;32m${formatoMoneda(totalGanado)}[0m\`\`\`\n\n`; 

    // Saldo Total
    footerContent += `## ${EMOJI_BANCO} Saldo en Cartera\n`; // Usamos EMOJI_BANCO
    footerContent += `\`\`\`ansi\n[0;36m${formatoMoneda(balance)}[0m\`\`\``;


    resumenContainer.addTextDisplayComponents(
        new TextDisplayBuilder()
            .setContent(footerContent)
    );
        
    return resumenContainer;
}


// ---------------------------------------------------
// COMANDO /COBRAR
// ---------------------------------------------------
module.exports = {
    data: new SlashCommandBuilder()
        .setName('cobrar')
        .setDescription('Cobra tu salario de todos tus trabajos. (Roles Incoming)'),
    async execute(interaction) {
        
        // Usamos deferReply PÚBLICO
        await interaction.deferReply(); 
        
        // VALIDACIÓN DE CANAL
        if (interaction.channelId !== CANAL_PERMITIDO) {
            // Usamos editReply efímero con el EMOJI_ERROR
            return interaction.editReply({ 
                content: `${EMOJI_ERROR} Este comando solo puede usarse en el canal de Bancolombia <#${CANAL_PERMITIDO}>.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // --- COMIENZA LA LÓGICA DE COBRO ---

        const userId = interaction.user.id;
        let totalDineroGanado = 0; // <-- Esta es la variable local
        const rolesPagados = [];
        const rolesEnCooldown = [];
        
        // 1. Cargar/Crear usuario en la base de datos
        let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
        if (!usuarioEconomia) {
            usuarioEconomia = await Economia.create({ discordId: userId });
        }
        
        // 2. Iterar roles y calcular pagos/cooldowns
        for (const roleId of interaction.member.roles.cache.keys()) {
            const jobConfig = config.jobs ? config.jobs[roleId] : null; 

            if (jobConfig) {
                const cooldownKey = `${userId}_${roleId}`;
                const cooldownTime = tiempoACooldown(jobConfig.tiempo, jobConfig.unidad);
                const role = interaction.guild.roles.cache.get(roleId);
                const roleMention = role ? role.toString() : 'Rol desconocido';

                if (cooldowns.has(cooldownKey)) {
                    const expirationTime = cooldowns.get(cooldownKey) + cooldownTime;
                    const timeLeft = expirationTime - Date.now();
                    
                    if (timeLeft > 0) {
                        const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                        // EMOJI_COOLDOWN fuera de backticks, pero el tiempo sigue dentro
                        rolesEnCooldown.push(`• ${roleMention}: ${EMOJI_COOLDOWN} \`${hours}h ${minutes}m\``); 
                        continue;
                    }
                }
                
                // Si el cooldown ha expirado, procesar el pago
                totalDineroGanado += jobConfig.dinero;
                // 🚨 CORRECCIÓN: EMOJI_CHECK fuera de backticks
                rolesPagados.push(`• ${roleMention}: ${EMOJI_CHECK} \`+${formatoMoneda(jobConfig.dinero)}\``); 
                cooldowns.set(cooldownKey, Date.now());
            }
        }

        if (rolesPagados.length === 0 && rolesEnCooldown.length === 0) {
            // Respuesta efímera si no hay roles de trabajo
            return interaction.editReply({ 
                content: `${EMOJI_ERROR} No tienes ningún rol de trabajo configurado.`,
                flags: MessageFlags.Ephemeral 
            });
        }
        
        // 3. Actualizar balance
        if (totalDineroGanado !== 0) {
            usuarioEconomia.cartera += totalDineroGanado;
            await usuarioEconomia.save();
        }

        try {
            // 4. Crear el Container V2
            const container = buildCobrarContainer(
                interaction, 
                totalDineroGanado, 
                usuarioEconomia.cartera, 
                rolesPagados, 
                rolesEnCooldown
            );

            // 5. Enviar respuesta final
            await interaction.editReply({ 
                components: [container], 
                flags: MessageFlags.IsComponentsV2,
            });

        } catch (error) {
            console.error('Error en el comando /cobrar V2:', error);
            // Respuesta de error efímera si falla el proceso
            await interaction.editReply({ 
                content: `${EMOJI_ERROR} Ocurrió un error al intentar cobrar. Por favor, intenta de nuevo más tarde.`,
                flags: MessageFlags.Ephemeral
            });
        }
    }
};