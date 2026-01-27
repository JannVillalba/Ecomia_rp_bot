const { 
    SlashCommandBuilder, 
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags
} = require('discord.js');
const Economia = require('../models/Economia');
const { sleep } = require('../utils/helpers'); // Asumiendo que tienes un archivo de utilidades

// --- EMOJIS PERSONALIZADOS ---
const EMOJI_DINERO = '<a:72389moneywings:1445094681418399917>'; // Dinero u efectivo
const EMOJI_BANCO = '<:banco:1413691028497764463>'; // Banco
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
// El EMOJI_INGRESO no se usa directamente aquí, pero lo mantengo por contexto
// El EMOJI_COOLDOWN no se usa aquí.

// ID del canal permitido (Bancolombia)
const CANAL_PERMITIDO = '1409090985907982337';
const SEPARATOR_SPACING_SMALL = 1;

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

/**
 * Función que crea y actualiza el Container de carga con un nuevo mensaje.
 */
async function updateLoadingContainer(interaction, title, message) {
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(16776960) // Amarillo (Dorado)
        .addTextDisplayComponents(
            // 🚨 USAMOS EMOJI_BANCO en el título de carga
            new TextDisplayBuilder().setContent(`## ${EMOJI_BANCO} ${title}`) 
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`\`\`\`css\n${message}\n\`\`\``)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Usuario: ${interaction.user.tag}*`)
        );
    
    await interaction.editReply({ 
        components: [loadingContainer], 
        content: '', 
        flags: MessageFlags.IsComponentsV2 
    });
}

/**
 * Crea el Container V2 para la confirmación de depósito.
 */
function crearConfirmacionContainer(montoADepositar, usuarioEconomia) {
    return new ContainerBuilder()
        .setAccentColor(7186854) // Verde (Éxito)
        .addTextDisplayComponents(
            // 🚨 USAMOS EMOJI_CHECK en el título de confirmación
            new TextDisplayBuilder().setContent(`## ${EMOJI_CHECK} DEPÓSITO EXITOSO`) 
        )
        // Monto de la Transacción
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Transacción:** Depósito de Cartera a Cuenta Bancaria\n` +
                `**Monto Depositado:** \`\`\`ansi\n[0;32m+ ${formatoMoneda(montoADepositar)}[0m\`\`\``
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        // Nuevos Saldos
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                // 🚨 USAMOS EMOJI_DINERO para Cartera
                `**${EMOJI_DINERO} Cartera (Dinero en Mano)**\n\`\`\`ansi\n[0;31m${formatoMoneda(usuarioEconomia.cartera)}[0m\`\`\`\n` +
                // 🚨 USAMOS EMOJI_BANCO para Banco
                `**${EMOJI_BANCO} Banco (Dinero Seguro)**\n\`\`\`ansi\n[0;32m${formatoMoneda(usuarioEconomia.banco)}[0m\`\`\``
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Notificación de Depósito Bancolombia - <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('depositar')
        .setDescription('Deposita dinero de tu cartera a tu banco.')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a depositar.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('opcion')
                .setDescription('Deposita todo el dinero de tu cartera.')
                .setRequired(false)
                .addChoices({ name: 'Todo', value: 'all' })),
    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        const opcion = interaction.options.getString('opcion');
        const userId = interaction.user.id;

        // DeferReply PÚBLICO
        await interaction.deferReply();

        // 🚨 VALIDACIÓN 1: Restricción de Canal (Mensaje de error efímero)
        if (interaction.channelId !== CANAL_PERMITIDO) {
            return interaction.editReply({ 
                // 🚨 USAMOS EMOJI_ERROR
                content: `${EMOJI_ERROR} Este comando solo puede usarse en el canal de Bancolombia <#${CANAL_PERMITIDO}>.`, 
                ephemeral: true 
            });
        }

        // VALIDACIÓN 2: Cantidad o Opción
        if (!cantidad && !opcion) {
            return interaction.editReply({ 
                // 🚨 USAMOS EMOJI_ERROR
                content: `${EMOJI_ERROR} Debes especificar una cantidad (\`/depositar cantidad: [número]\`) o usar la opción **Todo** (\`/depositar opcion: Todo\`).`, 
                ephemeral: true 
            });
        }
        
        // 🚨 SECUENCIA DE CARGA V2
        try {
            // Paso 1: Inicio
            await updateLoadingContainer(interaction, 
                'Accediendo a Bancolombia App...', // El EMOJI_BANCO ya está en la función
                '[+] Verificando clave dinámica...'
            );
            await sleep(1000);
            
            // Paso 2: Conexión
            await updateLoadingContainer(interaction, 
                'Procesando Solicitud...', 
                '[+] Conectando con bases de datos de Economía...\n[+] Solicitando información de cuenta...'
            );
            await sleep(1000);
            
            let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
            
            // Si el usuario no tiene cuenta, el proceso falla (mensaje efímero)
            if (!usuarioEconomia) {
                return interaction.editReply({ 
                    // 🚨 USAMOS EMOJI_ERROR
                    content: `${EMOJI_ERROR} No tienes una cuenta de economía registrada. No se puede realizar el depósito.`,
                    ephemeral: true
                });
            }

            let montoADepositar = cantidad;
            if (opcion === 'all') {
                montoADepositar = usuarioEconomia.cartera;
            }

            // Validación de monto
            if (montoADepositar <= 0) {
                 return interaction.editReply({
                    // 🚨 USAMOS EMOJI_ERROR
                    content: `${EMOJI_ERROR} La cantidad a depositar debe ser un número positivo, o tu cartera está vacía si elegiste "Todo".`,
                    ephemeral: true
                });
            }

            // Validación de fondos
            if (usuarioEconomia.cartera < montoADepositar) {
                return interaction.editReply({
                    // 🚨 USAMOS EMOJI_ERROR
                    content: `${EMOJI_ERROR} No tienes suficiente dinero en tu cartera para depositar **${formatoMoneda(montoADepositar)}**. Tu saldo actual en cartera es **${formatoMoneda(usuarioEconomia.cartera)}**.`,
                    ephemeral: true
                });
            }
            
            // Paso 3: Confirmación de Transacción (antes de guardar)
            await updateLoadingContainer(interaction, 
                // 🚨 USAMOS EMOJI_CHECK en el mensaje de verificación antes de la transacción final
                `${EMOJI_CHECK} Verificación Completa`, 
                `[+] Monto verificado: ${formatoMoneda(montoADepositar)}\n[+] Realizando transferencia bancaria...`
            );
            await sleep(1000);


            // Realizar el depósito y guardar
            usuarioEconomia.cartera -= montoADepositar;
            usuarioEconomia.banco += montoADepositar;
            await usuarioEconomia.save();

            // Mensaje de confirmación V2 (PÚBLICO)
            const finalContainer = crearConfirmacionContainer(montoADepositar, usuarioEconomia);
            
            await interaction.editReply({ 
                components: [finalContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en el comando /depositar:', error);
            // Mensaje de error genérico efímero (sin V2 por seguridad)
            await interaction.editReply({
                // 🚨 USAMOS EMOJI_ERROR
                content: `${EMOJI_ERROR} Ocurrió un error inesperado al intentar realizar el depósito. Por favor, intenta de nuevo más tarde.`,
                ephemeral: true,
                components: [], // Limpiar V2 si estaba en uso
                flags: 0 
            });
        }
    }
};