const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags 
} = require('discord.js');
const Economia = require('../models/Economia');
const { sleep } = require('../utils/helpers'); 

// --- CONSTANTES GLOBALES DE MÉXICO NUEVO LAREDO [ER:LC] Y V2 ---
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';     // Emoji de Error para México Nuevo Laredo [ER:LC]
const EMOJI_MONEY_WINGS = '<a:72389moneywings:1445094681418399917>'; // Emoji de dinero personalizado

// ID del canal permitido 
const CANAL_PERMITIDO = '1461773327474360499';
const SEPARATOR_SPACING_SMALL = 1;
const COLOR_ERROR = 0xFF0000; // Rojo

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

/**
 * Crea un Container V2 para un mensaje de error EPHÉMERO.
 */
function crearErrorContainerEphemeral(descripcion) {
    return new ContainerBuilder()
        .setAccentColor(COLOR_ERROR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Error en el Pago`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(descripcion)
        );
}

/**
 * Función que crea y actualiza el Container de carga con un nuevo mensaje.
 */
async function updateLoadingContainer(interaction, title, message) {
    // 🚨 Usamos el emoji personalizado en el título
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(16776960) // Amarillo (Dorado)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_MONEY_WINGS} ${title}`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`\`\`\`css\n${message}\n\`\`\``)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Usuario: ${interaction.user.tag}*`)
        );
    
    // El content debe ser vacío cuando usamos components V2
    await interaction.editReply({ 
        components: [loadingContainer], 
        content: '', 
        flags: MessageFlags.IsComponentsV2 // Mantenemos el flag V2
    });
}

/**
 * Crea el Container V2 para la confirmación de pago.
 */
function crearPagoContainer(pagador, receptor, cantidad, economiaPagador, economiaReceptor) {
    const BLUE_ACCENT_COLOR = 3450383; // Azul (#3498DB)
    
    return new ContainerBuilder()
        .setAccentColor(BLUE_ACCENT_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## <a:71227checkyes:1442172457862561923> TRANSACCIÓN EXITOSA')
        )
        // Detalles de la Transacción
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Pagador:** <@${pagador.id}>\n` +
                `**Receptor:** <@${receptor.id}>\n` +
                `**Monto Transferido:** \`\`\`ansi\n[0;32m+ ${formatoMoneda(cantidad)}[0m\`\`\``
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        // Nuevos Saldos
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Saldo Restante (Pagador)**\n\`\`\`ansi\n[0;31m${formatoMoneda(economiaPagador.cartera)}[0m\`\`\`\n` +
                `**Saldo Recibido (Receptor)**\n\`\`\`ansi\n[0;32m${formatoMoneda(economiaReceptor.cartera)}[0m\`\`\``
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Notificación de Transacción Bancolombia - <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('pagar')
        .setDescription('Transfiere dinero de tu cartera a otro usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres pagar.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a transferir.')
                .setRequired(true)),

    async execute(interaction) {
        const pagador = interaction.user;
        const receptor = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');

        // 🚨 CORRECCIÓN: Usamos deferReply con el flag V2 desde el inicio.
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 }); 

        // 🚨 VALIDACIÓN 1: Restricción de Canal
        if (interaction.channelId !== CANAL_PERMITIDO) {
            const errorContainer = crearErrorContainerEphemeral(`Este comando solo puede usarse en el canal de Bancolombia <#${CANAL_PERMITIDO}>.`);
            return interaction.editReply({ 
                components: [errorContainer],
                content: '',
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral // Respuesta efímera con V2
            });
        }
        
        // VALIDACIÓN 2: Cantidad y Autopago
        if (cantidad <= 0) {
            const errorContainer = crearErrorContainerEphemeral('La cantidad a pagar debe ser un número positivo.');
            return interaction.editReply({ 
                components: [errorContainer],
                content: '',
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }

        if (pagador.id === receptor.id) {
            const errorContainer = crearErrorContainerEphemeral('No puedes pagarte a ti mismo.');
            return interaction.editReply({ 
                components: [errorContainer],
                content: '',
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
        
        try {
            // 🚨 SECUENCIA DE CARGA V2
            // Paso 1: Inicio
            await updateLoadingContainer(interaction, 
                'Accediendo a Bancolombia App...', 
                '[+] Verificando seguridad de transferencia...'
            );
            await sleep(1000); 
            
            // Paso 2: Conexión y Validación
            await updateLoadingContainer(interaction, 
                'Procesando Solicitud...', 
                '[+] Conectando con bases de datos de Economía...\n[+] Validando fondos del pagador...'
            );
            await sleep(1000);

            // Obtener o crear los registros de economía
            let economiaPagador = await Economia.findOne({ where: { discordId: pagador.id } });
            
            // Si el pagador no tiene cuenta
            if (!economiaPagador) {
                const errorContainer = crearErrorContainerEphemeral('No tienes una cuenta de economía registrada para realizar transferencias. Debes generar un saldo primero.');
                return interaction.editReply({ 
                    components: [errorContainer],
                    content: '',
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            let economiaReceptor = await Economia.findOne({ where: { discordId: receptor.id } });
            if (!economiaReceptor) {
                economiaReceptor = await Economia.create({ discordId: receptor.id });
            }

            // Verificar si el pagador tiene suficiente dinero en la cartera
            if (economiaPagador.cartera < cantidad) {
                const errorContainer = crearErrorContainerEphemeral(`No tienes suficiente dinero en tu cartera para transferir **${formatoMoneda(cantidad)}**. Tu saldo actual es de **${formatoMoneda(economiaPagador.cartera)}**.`);
                return interaction.editReply({
                    components: [errorContainer],
                    content: '',
                    flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                });
            }

            // Paso 3: Realizando Transferencia
            await updateLoadingContainer(interaction, 
                'Transfiriendo Fondos...', 
                `[+] Autorizando el débito de ${formatoMoneda(cantidad)}...\n[+] Finalizando la transferencia...`
            );
            await sleep(1000);

            // Realizar la transferencia
            economiaPagador.cartera -= cantidad;
            economiaReceptor.cartera += cantidad;

            await economiaPagador.save();
            await economiaReceptor.save();

            // Mensaje de confirmación V2 (PÚBLICO)
            const finalContainer = crearPagoContainer(pagador, receptor, cantidad, economiaPagador, economiaReceptor);

            // Esta es la respuesta final de éxito (PÚBLICA)
            await interaction.editReply({ 
                components: [finalContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en el comando /pagar:', error);
            const errorContainer = crearErrorContainerEphemeral('Ocurrió un error inesperado al intentar realizar el pago. Por favor, intenta de nuevo más tarde.');
            
            // 🚨 CORRECCIÓN: Usamos el error container V2 y mantenemos el flag V2 y Ephemeral.
            await interaction.editReply({
                components: [errorContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral 
            });
        }
    }
};