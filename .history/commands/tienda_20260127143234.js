const { 
    SlashCommandBuilder, 
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const Economia = require('../models/Economia');

// --- CONSTANTES DE TIENDA Y EMOJIS ---
const EMOJI_STORE = '🛒';
const EMOJI_LIST = '📋';
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const EMOJI_BUY_BUTTON = '<:490209buybutton:1445183198626709685>';
const EMOJI_LOCK_STORE = '<:87233lockids:1445187244985159770>';

const EMOJI_PREV_PAGE = '<:832632leftarrow:1445184403654443009>';
const EMOJI_NEXT_PAGE = '<:3010rightarrow:1445184458427863102>';

const ITEMS_PER_PAGE = 6; 
const SEPARATOR_SPACING_SMALL = 1;
const ACCENT_COLOR_TIENDA = 3450383; // Azul
const ACCENT_COLOR_CONFIRM = 16776960; // Amarillo para confirmación

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2,
    }).format(cantidad);
};

// --------------------------------------------------------------------------------
// FUNCIÓN DE CREACIÓN DEL CONTAINER V2 Y COMPONENTES
// --------------------------------------------------------------------------------

const generateShopMessage = (page, totalPages, items, userBalance) => {
    const start = page * ITEMS_PER_PAGE;
    const itemsOnPage = items.slice(start, start + ITEMS_PER_PAGE);

    // --- Container V2 (Contenedor Único) ---
    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_TIENDA); 

    // Bloque 1: Título Principal y Saldo del Usuario
    container
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${EMOJI_STORE} Tienda Oficial New York Roleplay [ER:LC]`)
        )
        // Botón que solo muestra el Saldo del usuario
        .addActionRowComponents( 
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel(`Saldo: ${formatoMoneda(userBalance)} USD`) // Muestra el saldo
                        .setCustomId("user_balance_dummy")
                        .setDisabled(true)
                )
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true))
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`# ${EMOJI_LIST} Artículos disponibles.`)
        )
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true));
        
    // --- Bucle para los Artículos (Bloque de Texto + Botón) ---
    itemsOnPage.forEach((item, index) => {
        
        // 1. Contenido de Texto del Artículo (Título y Descripción)
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${item.emoji} ${item.nombre}\n` + 
                `\`\`\`\n${item.descripcion}\n\`\`\``
            )
        );
        
        // 2. Lógica para habilitar/deshabilitar el botón
        const canAfford = userBalance >= item.precio;
        
        const buyButton = new ButtonBuilder()
            .setCustomId(`buy_${item.id}`) 
            .setLabel(` $${formatoMoneda(item.precio)} `)
            .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary) 
            .setDisabled(!canAfford)
            .setEmoji(EMOJI_BUY_BUTTON);
            
        // 3. ActionRow (Contiene el botón de compra)
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(buyButton)
        );

        // 4. Separador V2 entre ítems
        if (index < itemsOnPage.length - 1) {
             container.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
            );
        }
    });

    // --- Botones de Paginación (ActionRow fuera del Container) ---
    const paginationRow = new ActionRowBuilder();
    paginationRow.addComponents(
        new ButtonBuilder()
            .setCustomId('prev_page')
            .setLabel('Anterior')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(EMOJI_PREV_PAGE)
            .setDisabled(page === 0),
        // Botón central de la página restaurado
        new ButtonBuilder()
            .setCustomId('page_info_dummy') 
            .setLabel(`${page + 1}/${totalPages}`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true), 
        new ButtonBuilder()
            .setCustomId('next_page')
            .setLabel('Siguiente')
            .setStyle(ButtonStyle.Primary)
            .setEmoji(EMOJI_NEXT_PAGE)
            .setDisabled(page === totalPages - 1)
    );

    return { 
        container: container,
        components: [paginationRow] // ActionRow que contiene los tres botones de paginación
    };
};

// --------------------------------------------------------------------------------
// FUNCIÓN PARA GENERAR EL MENSAJE DE CONFIRMACIÓN (NUEVA)
// --------------------------------------------------------------------------------

const generateConfirmMessage = (itemToBuy) => {
    
    // Contenedor V2
    const confirmContainer = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_CONFIRM)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ⚠️ Confirmación de Compra`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `Estás a punto de comprar **${itemToBuy.nombre}** por **$${formatoMoneda(itemToBuy.precio)} COP**.\n` + 
                `¿Deseas confirmar la transacción?`
            )
        );
        
    // Botones de Confirmación y Cancelación
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`confirm_buy_${itemToBuy.id}`)
            .setLabel('Confirmar Compra')
            .setStyle(ButtonStyle.Success)
            .setEmoji(EMOJI_CHECK), // Emoji de CHECK
            
        new ButtonBuilder()
            .setCustomId(`cancel_buy_${itemToBuy.id}`)
            .setLabel('Cancelar')
            .setStyle(ButtonStyle.Danger)
            .setEmoji(EMOJI_ERROR) // Emoji de ERROR
    );

    return { 
        container: confirmContainer,
        components: [confirmRow]
    };
}


// --------------------------------------------------------------------------------
// EXPORTACIÓN DEL COMANDO
// --------------------------------------------------------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tienda')
        .setDescription('Abre la tienda del servidor para comprar artículos.'),
        
    async execute(interaction) {
        // Deferir respuesta inicial (visible solo para el usuario en este caso, luego se edita)
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const storePath = path.join(__dirname, '../data/store.json');
        if (!fs.existsSync(storePath)) {
            fs.writeFileSync(storePath, JSON.stringify({ items: [] }, null, 2));
        }
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

        if (store.items.length === 0) {
            const errorContainer = new ContainerBuilder()
                .setAccentColor(10070709)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`${EMOJI_ERROR} La tienda está vacía en este momento. Intenta de nuevo más tarde.`)
                );
            return interaction.editReply({ 
                components: [errorContainer],
                content: '',
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        let usuarioEconomia = await Economia.findOne({ where: { discordId: interaction.user.id } });
        if (!usuarioEconomia) {
            usuarioEconomia = await Economia.create({ discordId: interaction.user.id });
        }
        const userBalance = usuarioEconomia.cartera || 0;


        const totalPages = Math.ceil(store.items.length / ITEMS_PER_PAGE);
        let currentPage = 0;

        const { container: initialContainer, components: initialComponents } = generateShopMessage(currentPage, totalPages, store.items, userBalance);

        const replyMessage = await interaction.editReply({ 
            components: [initialContainer, ...initialComponents], 
            content: '', 
            flags: MessageFlags.IsComponentsV2 
        });

        // Aumentamos el tiempo del collector para cubrir el tiempo de confirmación
        const collectorFilter = i => i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter: collectorFilter, time: 60000 * 5 });
        
        // Variable para almacenar temporalmente el ID del artículo que se está confirmando
        let confirmingItemId = null; 

        collector.on('collect', async i => {
            // Usamos deferUpdate para manejar la interacción sin enviar una respuesta inmediata
            await i.deferUpdate();

            if (i.isButton()) {
                
                // --- Lógica de Paginación ---
                if (i.customId === 'prev_page' || i.customId === 'next_page') {
                    
                    let newPage = currentPage;
                    if (i.customId === 'prev_page' && currentPage > 0) {
                        newPage--;
                    } else if (i.customId === 'next_page' && currentPage < totalPages - 1) {
                        newPage++;
                    }

                    if (newPage !== currentPage) {
                        currentPage = newPage;
                        
                        let currentUsuarioEconomia = await Economia.findOne({ where: { discordId: interaction.user.id } });
                        const currentUserBalance = currentUsuarioEconomia ? currentUsuarioEconomia.cartera : 0;
                        
                        const { container: newContainer, components: newComponents } = generateShopMessage(currentPage, totalPages, store.items, currentUserBalance);
                        
                        await i.editReply({
                            components: [newContainer, ...newComponents],
                            content: '',
                            flags: MessageFlags.IsComponentsV2
                        });
                    }
                    
                } 
                
                // --- Lógica de INICIAR Compra (Paso 1: Mostrar confirmación) ---
                else if (i.customId.startsWith('buy_')) {
                    const itemId = i.customId.replace('buy_', '');
                    const itemToBuy = store.items.find(item => item.id === itemId);

                    if (!itemToBuy) {
                        return i.followUp({ content: `${EMOJI_ERROR} El artículo no se encontró.`, flags: MessageFlags.Ephemeral });
                    }

                    let currentUsuarioEconomia = await Economia.findOne({ where: { discordId: i.user.id } });
                    
                    if (!currentUsuarioEconomia || currentUsuarioEconomia.cartera < itemToBuy.precio) {
                        return i.followUp({ content: `${EMOJI_ERROR} ¡Error de saldo! No tienes suficiente dinero en tu cartera para comprar **${itemToBuy.nombre}**.`, flags: MessageFlags.Ephemeral });
                    }
                    
                    // Almacenar el ID del artículo que se está confirmando
                    confirmingItemId = itemId; 
                    
                    // Mostrar el mensaje de confirmación
                    const { container: confirmContainer, components: confirmComponents } = generateConfirmMessage(itemToBuy);

                    await i.editReply({
                        components: [confirmContainer, ...confirmComponents], // Reemplaza la tienda por el mensaje de confirmación
                        content: '',
                        flags: MessageFlags.IsComponentsV2
                    });
                }
                
                // --- Lógica de CONFIRMAR Compra (Paso 2: Realizar transacción) ---
                else if (i.customId.startsWith('confirm_buy_')) {
                    const itemId = i.customId.replace('confirm_buy_', '');
                    
                    // Si el ID del botón no coincide con el ID almacenado, ignorar (seguridad simple)
                    if (itemId !== confirmingItemId) {
                         // Regresar a la tienda si la confirmación no coincide
                         const { container: returnContainer, components: returnComponents } = generateShopMessage(currentPage, totalPages, store.items, (await Economia.findOne({ where: { discordId: i.user.id } })).cartera);
                         await i.editReply({
                             components: [returnContainer, ...returnComponents],
                             content: '',
                             flags: MessageFlags.IsComponentsV2
                         });
                         return i.followUp({ content: `${EMOJI_ERROR} Error de sesión. Por favor, selecciona el artículo de nuevo.`, flags: MessageFlags.Ephemeral });
                    }
                    
                    const itemToBuy = store.items.find(item => item.id === itemId);
                    let currentUsuarioEconomia = await Economia.findOne({ where: { discordId: i.user.id } });
                    
                    // Doble verificación de saldo por si acaso
                    if (!itemToBuy || currentUsuarioEconomia.cartera < itemToBuy.precio) {
                        return i.followUp({ content: `${EMOJI_ERROR} ¡Error crítico de saldo! Revisa tu cartera.`, flags: MessageFlags.Ephemeral });
                    }

                    // Lógica de compra
                    currentUsuarioEconomia.cartera -= itemToBuy.precio;
                    
                    const purchasedItems = currentUsuarioEconomia.inventario || [];
                    purchasedItems.push(itemToBuy.id);
                    currentUsuarioEconomia.inventario = purchasedItems;
                    
                    await currentUsuarioEconomia.save();
                    
                    // Resetear el ID de confirmación
                    confirmingItemId = null;
                    
                    // --- Regenerar la tienda para reflejar el nuevo saldo y estado del botón ---
                    const newBalanceAfterPurchase = currentUsuarioEconomia.cartera;
                    
                    const { container: updatedContainer, components: updatedComponents } = generateShopMessage(currentPage, totalPages, store.items, newBalanceAfterPurchase);
                    
                    // Actualizar la tienda (quitando la confirmación)
                    await i.editReply({
                        components: [updatedContainer, ...updatedComponents],
                        content: '',
                        flags: MessageFlags.IsComponentsV2
                    });

                    // Mensaje de confirmación final
                    await i.followUp({
                        content: `${EMOJI_CHECK} ¡Compra exitosa! Has adquirido **${itemToBuy.nombre}** por $${formatoMoneda(itemToBuy.precio)}.`,
                        flags: MessageFlags.Ephemeral
                    });
                }

                // --- Lógica de CANCELAR Compra (Paso 2: Cancelación) ---
                else if (i.customId.startsWith('cancel_buy_')) {
                    // Resetear el ID de confirmación
                    confirmingItemId = null;
                    
                    // Regresar a la tienda
                    let currentUsuarioEconomia = await Economia.findOne({ where: { discordId: i.user.id } });
                    const currentUserBalance = currentUsuarioEconomia ? currentUsuarioEconomia.cartera : 0;
                    
                    const { container: returnContainer, components: returnComponents } = generateShopMessage(currentPage, totalPages, store.items, currentUserBalance);

                    await i.editReply({
                        components: [returnContainer, ...returnComponents],
                        content: '',
                        flags: MessageFlags.IsComponentsV2
                    });
                    
                    // Mensaje de cancelación
                    await i.followUp({
                        content: `${EMOJI_ERROR} ¡Compra cancelada! Has regresado a la tienda.`,
                        flags: MessageFlags.Ephemeral
                    });
                }
            }
        });

        collector.on('end', async () => {
            const expiredContainer = new ContainerBuilder()
                .setAccentColor(10070709) 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_LOCK_STORE} TIENDA CERRADA`) 
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('*El tiempo para comprar ha expirado. Vuelve a ejecutar /tienda para abrirla de nuevo.*')
                );
                
            // Usamos editReply para finalizar la interacción
            await interaction.editReply({ 
                components: [expiredContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2
            }).catch(() => {});
        });
    }
};