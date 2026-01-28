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

// --- CONSTANTES ---
const EMOJI_STORE = '🛒';
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>';
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const EMOJI_BUY_BUTTON = '<:490209buybutton:1445183198626709685>';
const EMOJI_LOCK_STORE = '<:87233lockids:1445187244985159770>';
const EMOJI_PREV_PAGE = '<:832632leftarrow:1445184403654443009>';
const EMOJI_NEXT_PAGE = '<:3010rightarrow:1445184458427863102>';

const ITEMS_PER_PAGE = 6; 
const ACCENT_COLOR_TIENDA = 3450383; 
const ACCENT_COLOR_CONFIRM = 16776960; 

const RESERVA_FEDERAL_ID = 'FEDERAL_RESERVE';

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

// --- FUNCIÓN GENERAR TIENDA (Solo Nombre) ---
const generateShopMessage = (page, totalPages, items, userBalance) => {
    const start = page * ITEMS_PER_PAGE;
    const itemsOnPage = items.slice(start, start + ITEMS_PER_PAGE);
    const container = new ContainerBuilder().setAccentColor(ACCENT_COLOR_TIENDA); 

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${EMOJI_STORE} Tienda Oficial Nuevo Laredo`)
    ).addActionRowComponents( 
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setStyle(ButtonStyle.Secondary)
                .setLabel(`Tu Cartera: ${formatoMoneda(userBalance)}`)
                .setCustomId("user_balance_dummy")
                .setDisabled(true)
        )
    ).addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true));
        
    itemsOnPage.forEach((item, index) => {
        // Solo añadimos el nombre con su emoji, sin descripción ni bloques de código
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${item.emoji} ${item.nombre}`)
        );
        
        const canAfford = userBalance >= item.precio;
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`buy_${item.id}`) 
                    .setLabel(` Comprar por ${formatoMoneda(item.precio)} `)
                    .setStyle(canAfford ? ButtonStyle.Success : ButtonStyle.Secondary) 
                    .setDisabled(!canAfford)
                    .setEmoji(EMOJI_BUY_BUTTON)
            )
        );

        if (index < itemsOnPage.length - 1) {
            container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true));
        }
    });

    const paginationRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('prev_page').setEmoji(EMOJI_PREV_PAGE).setStyle(ButtonStyle.Primary).setDisabled(page === 0),
        new ButtonBuilder().setCustomId('page_info').setLabel(`${page + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('next_page').setEmoji(EMOJI_NEXT_PAGE).setStyle(ButtonStyle.Primary).setDisabled(page === totalPages - 1)
    );

    return { container, components: [paginationRow] };
};

// --- FUNCIÓN GENERAR CONFIRMACIÓN ---
const generateConfirmMessage = (itemToBuy) => {
    const confirmContainer = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_CONFIRM)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ⚠️ CONFIRMAR COMPRA`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `Producto: **${itemToBuy.nombre}**\n` + 
            `Costo: **${formatoMoneda(itemToBuy.precio)}**`
        ));
        
    const confirmRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm_buy_${itemToBuy.id}`).setLabel('Confirmar Pago').setStyle(ButtonStyle.Success).setEmoji(EMOJI_CHECK),
        new ButtonBuilder().setCustomId(`cancel_buy_${itemToBuy.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger).setEmoji(EMOJI_ERROR)
    );

    return { container: confirmContainer, components: [confirmRow] };
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('tienda')
        .setDescription('Abre la tienda oficial de Nuevo Laredo.'),
        
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.IsComponentsV2 });

        const storePath = path.join(__dirname, '../../data/store.json');
        if (!fs.existsSync(storePath)) return interaction.editReply({ content: '❌ Error: No se encontró el archivo de la tienda.' });
        
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        let [userEco] = await Economia.findOrCreate({ where: { discordId: interaction.user.id } });

        const totalPages = Math.ceil(store.items.length / ITEMS_PER_PAGE);
        let currentPage = 0;
        let confirmingItemId = null; 

        const updateStoreView = async (int) => {
            const { container, components } = generateShopMessage(currentPage, totalPages, store.items, userEco.cartera);
            await int.editReply({ components: [container, ...components], flags: MessageFlags.IsComponentsV2 });
        };

        await updateStoreView(interaction);
        const reply = await interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({ filter: i => i.user.id === interaction.user.id, time: 300000 });

        collector.on('collect', async i => {
            await i.deferUpdate();

            if (i.customId === 'prev_page') { currentPage--; await updateStoreView(i); }
            else if (i.customId === 'next_page') { currentPage++; await updateStoreView(i); }
            
            else if (i.customId.startsWith('buy_')) {
                confirmingItemId = i.customId.replace('buy_', '');
                const item = store.items.find(it => it.id === confirmingItemId);
                if (!item) return;
                const { container, components } = generateConfirmMessage(item);
                await i.editReply({ components: [container, ...components], flags: MessageFlags.IsComponentsV2 });
            }

            else if (i.customId.startsWith('cancel_buy_')) {
                confirmingItemId = null;
                await updateStoreView(i);
            }

            else if (i.customId.startsWith('confirm_buy_')) {
                const itemId = i.customId.replace('confirm_buy_', '');
                const item = store.items.find(it => it.id === itemId);
                await userEco.reload();

                if (userEco.cartera < item.precio) return i.followUp({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

                try {
                    await userEco.update({ 
                        cartera: userEco.cartera - item.precio,
                        inventario: [...(userEco.inventario || []), item.id]
                    });

                    const [reserva] = await Economia.findOrCreate({ where: { discordId: RESERVA_FEDERAL_ID } });
                    await reserva.increment('banco', { by: item.precio });

                    confirmingItemId = null;
                    await updateStoreView(i);
                    await i.followUp({ content: `${EMOJI_CHECK} Has comprado **${item.nombre}**.`, flags: MessageFlags.Ephemeral });
                } catch (e) {
                    console.error(e);
                    await i.followUp({ content: '❌ Error en la transacción.', flags: MessageFlags.Ephemeral });
                }
            }
        });

        collector.on('end', () => {
            const endContainer = new ContainerBuilder().setAccentColor(10070709).addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_LOCK_STORE} TIENDA CERRADA`));
            interaction.editReply({ components: [endContainer], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        });
    }
};