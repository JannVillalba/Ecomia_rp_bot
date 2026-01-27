const { 
    SlashCommandBuilder, 
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags 
} = require('discord.js');
const Economia = require('../models/Economia');

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
 * Crea el Container V2 para la confirmación de retiro.
 */
function crearRetiroContainer(montoARetirar, usuarioEconomia) {
    // Color Rojo (#E74C3C) para indicar retiro/gasto
    const RED_ACCENT_COLOR = 15105572; 
    
    return new ContainerBuilder()
        .setAccentColor(RED_ACCENT_COLOR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## ✅ RETIRO EXITOSO')
        )
        // Monto de la Transacción
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Transacción:** Retiro Bancario\n` +
                `**Monto Retirado:** \`\`\`ansi\n[0;31m- ${formatoMoneda(montoARetirar)}[0m\`\`\``
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        // Nuevos Saldos
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**🏦 Banco (Dinero Seguro)**\n\`\`\`ansi\n[0;31m${formatoMoneda(usuarioEconomia.banco)}[0m\`\`\`\n` +
                `**💰 Cartera (Dinero en Mano)**\n\`\`\`ansi\n[0;32m${formatoMoneda(usuarioEconomia.cartera)}[0m\`\`\``
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Notificación de Retiro Bancario - <t:${Math.floor(Date.now() / 1000)}:R>*`)
        );
}


module.exports = {
    data: new SlashCommandBuilder()
        .setName('retirar')
        .setDescription('Retira dinero de tu banco a tu cartera.')
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a retirar.')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('opcion')
                .setDescription('Retira todo el dinero de tu banco.')
                .setRequired(false)
                .addChoices({ name: 'Todo', value: 'all' })),
    async execute(interaction) {
        const cantidad = interaction.options.getInteger('cantidad');
        const opcion = interaction.options.getString('opcion');
        const userId = interaction.user.id;

        // VALIDACIÓN PREVIA: Cantidad o Opción (Se mantiene efímero, no requiere V2)
        if (!cantidad && !opcion) {
            return interaction.reply({ content: '❌ Debes especificar una cantidad o la opción "Todo".', ephemeral: true });
        }
        
        // DeferReply PÚBLICO
        await interaction.deferReply();

        try {
            let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
            
            // Mensaje de error (no V2, usa content)
            if (!usuarioEconomia) {
                return interaction.editReply('❌ No tienes una cuenta de economía registrada.');
            }

            let montoARetirar = cantidad;
            if (opcion === 'all') {
                montoARetirar = usuarioEconomia.banco;
            }

            // Validación de fondos (no V2, usa content)
            if (montoARetirar <= 0 || usuarioEconomia.banco < montoARetirar) {
                return interaction.editReply('❌ No tienes suficiente dinero en tu banco para realizar este retiro.');
            }

            // Realizar la transacción
            usuarioEconomia.banco -= montoARetirar;
            usuarioEconomia.cartera += montoARetirar;
            await usuarioEconomia.save();

            // Mensaje de confirmación V2
            const finalContainer = crearRetiroContainer(montoARetirar, usuarioEconomia);
            
            await interaction.editReply({ 
                components: [finalContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('Error en el comando /retirar:', error);
            // Mensaje de error genérico (no V2, usa content)
            await interaction.editReply('❌ Ocurrió un error al intentar realizar el retiro. Por favor, intenta de nuevo más tarde.');
        }
    }
};