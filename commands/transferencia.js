const {
    SlashCommandBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    SeparatorBuilder,
} = require('discord.js');
const Economia = require('../models/Economia');

// --- CONSTANTES GLOBALES DE BOGOTÁ Y V2 ---
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>'; // Emoji de Check para Bogotá
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';     // Emoji de Error para Bogotá
const EMOJI_MONEY = '<a:72389moneywings:1445094681418399917>'; // Emoji personalizado

// Constantes de color
const COLOR_EXITO = 0x3498DB; // Azul (para la transferencia)
const COLOR_FACTURA = 0x2C3E50; // Gris oscuro
const COLOR_ERROR = 0xFF0000; // Rojo (Para mensajes de error V2)

// Valores numéricos de espaciado para evitar el ValidationError
const SPACING_SMALL = 1; 
const SPACING_MEDIUM = 2;

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

/**
 * Crea un Container V2 para un mensaje de error.
 */
function crearErrorContainer(descripcion) {
    return new ContainerBuilder()
        .setAccentColor(COLOR_ERROR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Error en la Transferencia`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(descripcion)
        );
}

// --- FUNCIÓN V2: Mensaje Público de Éxito ---
const crearContainerExitoPublico = (pagadorId, receptorId, cantidad, nuevoSaldoPagador) => {
    const cantidadFormateada = formatoMoneda(cantidad);
    const nuevoSaldoFormateado = formatoMoneda(nuevoSaldoPagador);
    
    return new ContainerBuilder()
        .setAccentColor(COLOR_EXITO)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 💸 Transferencia Bancaria Exitosa`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`El usuario **<@${pagadorId}>** ha transferido dinero a **<@${receptorId}>**.`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SPACING_SMALL).setDivider(true) 
        )
        .addTextDisplayComponents(
            // 🚨 CORRECCIÓN: Eliminamos el '#' para que el ANSI y el emoji se muestren
            new TextDisplayBuilder().setContent(` ${EMOJI_MONEY} **Monto:** \`\`\`ansi\n[0;32m${cantidadFormateada}[0m\n\`\`\``), 
            new TextDisplayBuilder().setContent(`*Saldo restante del pagador: ${nuevoSaldoFormateado}*`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`_Operación completada: <t:${Math.floor(Date.now() / 1000)}:T>_`)
        );
};

// --- FUNCIÓN V2: Mensaje DM de Factura ---
const crearContainerFacturaDM = (pagadorTag, receptorTag, cantidad, nuevoSaldoReceptor) => {
    const cantidadFormateada = formatoMoneda(cantidad);
    const nuevoSaldoFormateado = formatoMoneda(nuevoSaldoReceptor);
    
    const container = new ContainerBuilder()
        .setAccentColor(COLOR_FACTURA)
        
        // Bloque 1: Título
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## 📄 Factura de Transferencia Recibida')
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SPACING_SMALL).setDivider(true)); 

    // Bloque 2: Detalles Generales
    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Detalles')
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Fecha:** ${new Date().toLocaleString()}\n` +
                `**De:** \`${pagadorTag}\`\n` +
                `**Para:** \`${receptorTag}\``
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SPACING_SMALL).setDivider(false)); 

    // Bloque 3: Montos
    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('### Montos')
        )
        .addTextDisplayComponents(
            // ANSI verde para el monto recibido
            new TextDisplayBuilder().setContent(`**💰 Monto Recibido:** \`\`\`ansi\n[0;32m+${cantidadFormateada}[0m\n\`\`\``)
        )
        .addTextDisplayComponents(
            // El saldo se mantiene en bloque de código simple
            new TextDisplayBuilder().setContent(`**💳 Nuevo Saldo Bancario:** \`\`\`\n${nuevoSaldoFormateado}\n\`\`\``)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SPACING_MEDIUM).setDivider(true)); 

    // Bloque 4: Footer
    container
        .addTextDisplayComponents(
             new TextDisplayBuilder().setContent('_Banco Central de Bogotá RP_')
        );
        
    return container;
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('transferencia')
        .setDescription('Transfiere dinero de tu cuenta de banco a otro usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario al que quieres transferir dinero.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('cantidad')
                .setDescription('La cantidad de dinero a transferir.')
                .setRequired(true)),

    async execute(interaction) {
        const pagador = interaction.user;
        const receptor = interaction.options.getUser('usuario');
        const cantidad = interaction.options.getInteger('cantidad');

        if (cantidad <= 0) {
            // Respuesta efímera normal (no V2)
            return interaction.reply({ content: `${EMOJI_ERROR} La cantidad a transferir debe ser un número positivo.`, ephemeral: true });
        }

        if (pagador.id === receptor.id) {
            // Respuesta efímera normal (no V2)
            return interaction.reply({ content: `${EMOJI_ERROR} No puedes transferirte dinero a ti mismo.`, ephemeral: true });
        }

        // Deferir con flag V2
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        try {
            // Obtener o crear los registros de economía
            let economiaPagador = await Economia.findOne({ where: { discordId: pagador.id } });
            if (!economiaPagador) {
                const errorContainer = crearErrorContainer('No tienes una cuenta de economía registrada. Usa `/banco` para crear una.');
                return interaction.editReply({ 
                    content: '', 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            let economiaReceptor = await Economia.findOne({ where: { discordId: receptor.id } });
            if (!economiaReceptor) {
                economiaReceptor = await Economia.create({ discordId: receptor.id });
            }

            // Verificar si el pagador tiene suficiente dinero en el banco
            if (economiaPagador.banco < cantidad) {
                const errorContainer = crearErrorContainer('No tienes suficiente dinero en tu banco para realizar esta transferencia.');
                return interaction.editReply({ 
                    content: '', 
                    components: [errorContainer],
                    flags: MessageFlags.IsComponentsV2,
                });
            }

            // Realizar la transferencia
            economiaPagador.banco -= cantidad;
            economiaReceptor.banco += cantidad;

            await economiaPagador.save();
            await economiaReceptor.save();

            // --- Mensaje público en el canal (V2) ---
            const containerCanal = crearContainerExitoPublico(
                pagador.id, 
                receptor.id, 
                cantidad, 
                economiaPagador.banco
            );
            
            await interaction.editReply({ 
                content: '', 
                components: [containerCanal],
                flags: MessageFlags.IsComponentsV2,
            });

            // --- Factura enviada al DM del receptor (V2) ---
            const containerDM = crearContainerFacturaDM(
                pagador.tag,
                receptor.tag,
                cantidad,
                economiaReceptor.banco
            );

            await receptor.send({ 
                content: '', 
                components: [containerDM],
                flags: MessageFlags.IsComponentsV2,
            })
            .catch(() => console.error(`No se pudo enviar la factura V2 al DM de ${receptor.tag}`));

        } catch (error) {
            console.error('Error en el comando /transferencia:', error);
            const errorContainer = crearErrorContainer('Ocurrió un error inesperado al intentar realizar la transferencia.');
            await interaction.editReply({ 
                content: '', 
                components: [errorContainer], 
                flags: MessageFlags.IsComponentsV2,
            });
        }
    }
};