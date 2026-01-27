// /home/achitodev/Documentos/MéxicoNuevoLaredoERLC/handlers/casinoHandler.js

const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');
const casinoModule = require('../commands/casino.js'); 

// --- Constantes de Emojis y Configuración (Asegúrate de que coincidan con casino.js) ---
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>'; 
const SEPARATOR_SPACING_SMALL = 1; // Necesario para construir el mensaje de error V2
// --------------------------------------------------------------------------------------


/**
 * Manejador principal para todas las interacciones de componentes relacionadas con el Casino.
 * @param {import('discord.js').Interaction} interaction La interacción de Discord.
 * @returns {Promise<void>}
 */
async function handleCasinoInteractions(interaction) {
    
    // Si la interacción no tiene un mensaje asociado (ej: ModalSubmit inicial, aunque ya deberíamos tener deferUpdate)
    if (!interaction.message) {
        // Permitimos el procesamiento de modales o comandos iniciales aquí, pero para componentes es crítico.
    }

    // 🚨 1. VERIFICACIÓN DE PROPIETARIO DEL MENÚ 🚨
    // En las respuestas de comando, el ID del usuario se suele adjuntar al pie o en el contenido del mensaje.
    // Para simplificar, intentaremos extraer el ID del usuario mencionado en el contenido del mensaje.

    const currentUserId = interaction.user.id;
    let originalUserId = null;

    // Intentamos extraer el ID del usuario mencionado en el contenido
    // Patrón: <@ID_USUARIO> o a veces en la estructura V2, el TextDisplay del saludo.
    // Asumiremos que el ID del propietario está en el contenido original del mensaje (si es una edición)
    // Usaremos el ID del usuario que interactuó con el comando /casino original, que se encuentra en `interaction.message.interaction.user.id`

    if (interaction.message?.interaction?.user?.id) {
        // Esta es la forma más fiable para interacciones de comandos Slash.
        originalUserId = interaction.message.interaction.user.id;
    } 
    // Si no es un mensaje de comando, o si la interacción.message.interaction no está disponible (ej. mensajes muy viejos),
    // se podría intentar buscar en el contenido:
    /*
    else if (interaction.message?.content) {
        const match = interaction.message.content.match(/<@!?(\d+)>/);
        if (match) originalUserId = match[1];
    }
    */
    
    // Si logramos determinar el propietario y NO es el usuario actual, enviamos el error.
    if (originalUserId && currentUserId !== originalUserId) {
        // Bloqueamos la interacción para el usuario no propietario.

        // Construir el mensaje de error V2
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xE74C3C)
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Acceso Denegado\n\n`),
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`**Este no es tu menú de casino, atrevido confianzudo.** Por favor, abre el tuyo con \`/casino\`, perezosa.`),
            );

        // Usamos followUp para que el mensaje de error sea efímero y no intente editar el mensaje de otro usuario.
        // Si usamos followUp, debe ser efímero para no spamear el chat.
        return interaction.reply({
            components: [errorContainer],
            content: '',
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true, // ¡Importante! Solo el usuario ve este error
        });
    }

    // --- Menús de Selección (StringSelectMenu) ---
    if (interaction.isStringSelectMenu()) {
        const customId = interaction.customId;

        // 1. Selector de juego principal
        if (customId === 'casino_game_selector') {
            const selectedValue = interaction.values[0];
            await casinoModule.handlers.handleCasinoGameSelection(interaction, selectedValue);
            return;
        } 
        
        // 2. Selector de porcentaje de Slot Machine
        else if (customId === 'slot_bet_percent') {
            await interaction.deferUpdate(); 
            const betPercentage = interaction.values[0]; // Retorna el porcentaje como string (ej: '15')
            await casinoModule.handlers.handleSlotBet(interaction, betPercentage);
            return;
        }
    } 
    
    // --- Botones (Button) ---
    else if (interaction.isButton()) {
        const customId = interaction.customId;

        // 1. Botón para abrir el Modal de Slot Machine
        if (customId === 'slot_bet_modal') {
            // El modal no requiere deferUpdate/deferReply
            await casinoModule.handlers.handleSlotBetModal(interaction);
            return;
        } 
        
        // 2. Botones de Slot Machine (Jugar de Nuevo y Regresar)
        else if (customId === 'slot_play' || customId === 'slot_back') {
            await interaction.deferUpdate();
            await casinoModule.handlers.handleSlotMachineButtons(interaction);
            return;
        }
        
        // 3. Botón de Balance (Deshabilitado, no necesita acción)
        else if (customId === 'casino_balance_display' || customId === 'slot_balance_display' || customId === 'result_balance_display') {
             // Es un botón deshabilitado, no hacemos nada.
             return;
        }
    }
    
    // --- Modales (ModalSubmit) ---
    else if (interaction.isModalSubmit()) {
        const customId = interaction.customId;

        // 1. Envío del Modal de Slot Machine
        if (customId === 'slot_modal_submit') {
            // Se utiliza deferUpdate para evitar el timeout del modal.
            await interaction.deferUpdate(); 
            
            const betAmountInput = interaction.fields.getTextInputValue('bet_amount_input');
            const betAmount = parseInt(betAmountInput.replace(/[^0-9]/g, '')); // Limpiar cualquier formato/puntuación
            
            // Si la cantidad no es un número válido o es <= 0, usamos 0 para que handleSlotBet maneje el error
            const finalBet = isNaN(betAmount) || betAmount <= 0 ? 0 : betAmount;

            // handleSlotBet gestiona la validación de balance y la ejecución del juego
            await casinoModule.handlers.handleSlotBet(interaction, finalBet);
            return;
        }
    }
    
    // Si la interacción es un componente del casino pero no fue manejada arriba (ej. si hay un error de lógica)
    console.warn(`[Casino Handler] Interacción no manejada: ${interaction.customId}`);
}

module.exports = {
    handleCasinoInteractions,
};