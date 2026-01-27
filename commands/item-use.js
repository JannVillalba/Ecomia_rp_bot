const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MessageFlags,
    // Componentes V1/V2 compatibles
    ButtonBuilder, 
    ButtonStyle,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const Economia = require('../models/Economia');

// --- CONSTANTES DE INVENTARIO Y EMOJIS ---
const EMOJI_INVENTORY = '<:7293backpack:1445198526924722206>';
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>'; 
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const ACCENT_COLOR_INVENTARIO = 7186854; // Verde
const SEPARATOR_SPACING_SMALL = 1;


// --------------------------------------------------------------------------------
// FUNCIÓN DE CREACIÓN DEL CONTAINER V2 (ACTUALIZADA: Muestra Nombre del Rol)
// --------------------------------------------------------------------------------

// Ahora acepta 'guild' para buscar el nombre del rol
function crearInventarioContainer(groupedInventory, storeItems, guild) {
    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_INVENTARIO); 

    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## ${EMOJI_INVENTORY} Tu Inventario de Artículos Usables`)
    );
    
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent('Selecciona el ítem que deseas **usar** para obtener el rol permanente:')
    );
    
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true));
    
    if (groupedInventory.length === 0) {
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${EMOJI_ERROR} No tienes artículos usables en este momento.`)
        );
        return { container }; 
    }

    // Iteramos sobre los ítems agrupados
    groupedInventory.forEach(group => {
        const itemInfo = storeItems.find(i => i.id === group.id);
        
        // 🚨 OBTENER EL NOMBRE DEL ROL
        let roleName = `[ID: ${group.rolId}]`;
        if (itemInfo && itemInfo.rolId) {
            const role = guild.roles.cache.get(itemInfo.rolId);
            roleName = role ? role.name : `[Rol no encontrado: ${itemInfo.rolId}]`;
        }
        
        // 1. Contenido textual del ítem
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${itemInfo.emoji} ${itemInfo.nombre}\n` + 
                `\`\`\`Usa este ítem para obtener el rol permanente: ${roleName}.\`\`\`` // Muestra el nombre
            )
        );
        
        // 2. Botón de Cantidad
        const countButton = new ButtonBuilder()
            .setCustomId(`count_dummy_${group.id}`) 
            .setLabel(`${group.count} en Inventario`)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true); 
            
        // 3. Botón de Uso
        const useButton = new ButtonBuilder()
            .setCustomId(`use_item_${group.id}`) 
            .setLabel(`Usar 1`)
            .setStyle(ButtonStyle.Success)
            .setEmoji('✨'); 

        // 4. ActionRow V1/V2 compatible, añadida DIRECTAMENTE al Container
        container.addActionRowComponents(
            new ActionRowBuilder().addComponents(countButton, useButton)
        );

        // 5. Separador V2 entre ítems
        container.addSeparatorComponents(new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true));
    });
    
    return { container }; 
}


// --------------------------------------------------------------------------------
// EXPORTACIÓN DEL COMANDO
// --------------------------------------------------------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('item-use')
        .setDescription('Usa un artículo de tu inventario.'),
    async execute(interaction) {
        // Aseguramos que estamos en un guild y obtenemos el objeto guild
           if (!interaction.guild) {
               return interaction.reply({ content: `${EMOJI_ERROR} Este comando solo puede ser usado en un servidor.`, flags: MessageFlags.Ephemeral });
           }
        const guild = interaction.guild;
        
        // Ephemeral y V2
        await interaction.deferReply({ flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });

        const storePath = path.join(__dirname, '../data/store.json');
        if (!fs.existsSync(storePath)) {
            const errorContainer = new ContainerBuilder().setAccentColor(16711680)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_ERROR} La tienda no está configurada. Contacta a un administrador.`));
            return interaction.editReply({ components: [errorContainer], content: '', flags: MessageFlags.IsComponentsV2 });
        }
        const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));

        let usuarioEconomia = await Economia.findOne({ where: { discordId: interaction.user.id } });
        if (!usuarioEconomia) {
            usuarioEconomia = await Economia.create({ discordId: interaction.user.id, inventario: [] });
        }
        const userInventory = usuarioEconomia.inventario || [];

        // --- 1. Agrupar ítems usables por cantidad ---
        const itemCounts = userInventory.reduce((acc, itemId) => {
            const itemDetails = store.items.find(item => item.id === itemId && item.rolId);
            if (itemDetails) {
                acc[itemId] = (acc[itemId] || 0) + 1;
            }
            return acc;
        }, {});
        
        // Formato para la función crearInventarioContainer
        const groupedUsableItems = Object.entries(itemCounts).map(([id, count]) => ({
            id: id,
            count: count,
            rolId: store.items.find(item => item.id === id).rolId 
        }));
        
        if (groupedUsableItems.length === 0) {
            const errorContainer = new ContainerBuilder().setAccentColor(16711680)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`${EMOJI_ERROR} No tienes artículos en tu inventario que se puedan usar para obtener roles.`));
            return interaction.editReply({ components: [errorContainer], content: '', flags: MessageFlags.IsComponentsV2 });
        }
        
        // --- 2. Generar y Enviar la Vista Inicial ---
        const { container: inventoryContainer } = crearInventarioContainer(groupedUsableItems, store.items, guild); // 🚨 PASAMOS GUILD
        
        const replyMessage = await interaction.editReply({ 
            components: [inventoryContainer],
            content: '', 
            flags: MessageFlags.IsComponentsV2
        });

        // --- 3. Collector de Interacciones ---
        const collectorFilter = i => i.customId.startsWith('use_item_') && i.user.id === interaction.user.id;
        const collector = replyMessage.createMessageComponentCollector({ filter: collectorFilter, time: 60000 });

        collector.on('collect', async i => {
            if (i.customId.startsWith('use_item_')) {
                
                await i.deferUpdate();

                const itemId = i.customId.replace('use_item_', '');
                const itemToUse = store.items.find(item => item.id === itemId);

                // Cargar la instancia más fresca de nuevo
                let currentUsuarioEconomia = await Economia.findOne({ where: { discordId: i.user.id } });
                let currentInventory = currentUsuarioEconomia.inventario || [];

                // Validar si el ítem está realmente en el inventario para ser usado (cantidad > 0)
                if (!itemToUse || !currentInventory.includes(itemId)) {
                    
                    // Lógica para refrescar la vista si falla la validación (muestra que el ítem se agotó)
                    const updatedItemCounts = currentInventory.reduce((acc, id) => {
                         const itemDetails = store.items.find(item => item.id === id && item.rolId);
                         if (itemDetails) {
                            acc[id] = (acc[id] || 0) + 1;
                         }
                         return acc;
                    }, {});
                    
                    const finalGroupedItems = Object.entries(updatedItemCounts).map(([id, count]) => ({
                        id: id, count: count, rolId: store.items.find(item => item.id === id).rolId
                    }));

                    const { container: updatedContainer } = crearInventarioContainer(finalGroupedItems, store.items, guild); // 🚨 PASAMOS GUILD
                    await i.editReply({ components: [updatedContainer], content: '', flags: MessageFlags.IsComponentsV2 });
                    
                    return i.followUp({ content: `${EMOJI_ERROR} El artículo ya no se encuentra en tu inventario o se agotó.`, ephemeral: true });
                }

                // 4. Lógica de Uso
                try {
                    // Dar el rol
                    const member = await interaction.guild.members.fetch(i.user.id);
                    await member.roles.add(itemToUse.rolId);

                    // LÓGICA CLAVE: Remover una unidad del ítem del inventario
                    const indexToRemove = currentInventory.indexOf(itemId);
                    if (indexToRemove > -1) {
                        currentInventory.splice(indexToRemove, 1);
                        currentUsuarioEconomia.inventario = currentInventory;
                        await currentUsuarioEconomia.save(); 
                    } else {
                        throw new Error("Ítem no encontrado en el array para remover.");
                    }
                } catch (err) {
                    console.error('Error al usar ítem y dar rol:', err);
                    return i.followUp({ content: `${EMOJI_ERROR} No se pudo completar el uso. Error al dar el rol o al guardar la base de datos.`, ephemeral: true });
                }
                
                // --- 5. REFRESCAR LA VISTA con el Inventario Actualizado ---
                
                // Volver a agrupar los ítems restantes
                currentInventory = currentUsuarioEconomia.inventario || [];
                const updatedItemCounts = currentInventory.reduce((acc, id) => {
                    const itemDetails = store.items.find(item => item.id === id && item.rolId);
                    if (itemDetails) {
                        acc[id] = (acc[id] || 0) + 1;
                    }
                    return acc;
                }, {});
                
                const updatedGroupedItems = Object.entries(updatedItemCounts).map(([id, count]) => ({
                    id: id, count: count, rolId: store.items.find(item => item.id === id).rolId
                }));
                
                // Generar los nuevos componentes
                const { container: updatedContainer } = crearInventarioContainer(updatedGroupedItems, store.items, guild); // 🚨 PASAMOS GUILD
                
                await i.editReply({ 
                    components: [updatedContainer], 
                    content: '', 
                    flags: MessageFlags.IsComponentsV2 
                });
                
                await i.followUp({ content: `${EMOJI_CHECK} ¡Has usado **${itemToUse.nombre}** y has recibido el rol!`, ephemeral: true });
                
                // Si ya no quedan más ítems usables, detener el colector
                if (updatedGroupedItems.length === 0) {
                    collector.stop(); 
                }
            }
        });

        collector.on('end', async collected => {
            const expiredContainer = new ContainerBuilder()
                .setAccentColor(10070709) 
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Inventario Cerrado`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('*El tiempo para usar un artículo ha expirado. Vuelve a ejecutar /item-use.*')
                );
            
            await interaction.editReply({ 
                components: [expiredContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2 
            }).catch(console.error); 
        });
    }
};