const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
// Importa el config para obtener el ID del rol de administrador
const configPath = path.join(__dirname, '../config.json');
const config = require(configPath); 
const storePath = path.join(__dirname, '../data/store.json');

// ID del rol que puede usar este comando (Usaremos el ID que especificaste antes para configurar trabajos)
const ADMIN_ROLE_ID = '1460691619836723515'; 

const saveStore = (storeData) => {
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
};

const loadStore = () => {
    if (!fs.existsSync(storePath)) {
        fs.writeFileSync(storePath, JSON.stringify({ items: [] }, null, 2));
        return { items: [] };
    }
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gestionar-tienda')
        .setDescription('Comandos de administración para configurar los items de la tienda.')
        // --- SUBCOMANDO: AGREGAR ITEM ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('agregar')
                .setDescription('Añade un nuevo artículo a la tienda.')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID único del artículo (ej: "pistola_basica").')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nombre')
                        .setDescription('Nombre visible del artículo.')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('precio')
                        .setDescription('Precio de venta del artículo.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('descripcion')
                        .setDescription('Descripción corta del artículo.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji para el artículo (ej: 🔫).')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('rol')
                        .setDescription('Rol requerido para este artículo.')
                        .setRequired(true)))
        // --- SUBCOMANDO: ACTUALIZAR ITEM ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('actualizar')
                .setDescription('Actualiza el nombre, precio, descripción o emoji de un artículo existente.')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID del artículo a actualizar.')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('nombre')
                        .setDescription('Nuevo nombre del artículo.'))
                .addIntegerOption(option =>
                    option.setName('precio')
                        .setDescription('Nuevo precio de venta del artículo.'))
                .addStringOption(option =>
                    option.setName('descripcion')
                        .setDescription('Nueva descripción del artículo.'))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Nuevo emoji para el artículo.')))
        // --- SUBCOMANDO: ELIMINAR ITEM ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('eliminar')
                .setDescription('Elimina un artículo de la tienda usando su ID.')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID único del artículo a eliminar.')
                        .setRequired(true))),
                        
    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        // Verificar permisos
        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.editReply({ content: '❌ No tienes permisos para usar este comando de gestión de tienda.' });
        }
        
        const subcommand = interaction.options.getSubcommand();
        let store = loadStore();

        try {
            if (subcommand === 'agregar') {
                const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
                const nombre = interaction.options.getString('nombre');
                const precio = interaction.options.getInteger('precio');
                const descripcion = interaction.options.getString('descripcion');
                const emoji = interaction.options.getString('emoji');
                const rol = interaction.options.getRole('rol');

                if (store.items.some(item => item.id === id)) {
                    return interaction.editReply(`❌ El artículo con ID \`${id}\` ya existe.`);
                }
                if (precio <= 0) {
                    return interaction.editReply('❌ El precio debe ser un número positivo.');
                }

                if (!rol) {
                    return interaction.editReply('❌ Debes seleccionar un rol válido para este artículo.');
                }
                const newItem = { id, nombre, precio, descripcion, emoji, rol: rol.id };
                store.items.push(newItem);
                saveStore(store);

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ Artículo Agregado')
                    .setDescription(`**${emoji} ${nombre}** se ha añadido a la tienda. (ID: \`${id}\`)`);
                
                return interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'actualizar') {
                const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
                const itemIndex = store.items.findIndex(item => item.id === id);

                if (itemIndex === -1) {
                    return interaction.editReply(`❌ No se encontró ningún artículo con ID \`${id}\`.`);
                }

                const item = store.items[itemIndex];
                const newNombre = interaction.options.getString('nombre');
                const newPrecio = interaction.options.getInteger('precio');
                const newDescripcion = interaction.options.getString('descripcion');
                const newEmoji = interaction.options.getString('emoji');

                let updated = false;
                if (newNombre) { item.nombre = newNombre; updated = true; }
                if (newPrecio !== null) { 
                    if (newPrecio <= 0) return interaction.editReply('❌ El precio debe ser positivo.');
                    item.precio = newPrecio; updated = true; 
                }
                if (newDescripcion) { item.descripcion = newDescripcion; updated = true; }
                if (newEmoji) { item.emoji = newEmoji; updated = true; }

                if (!updated) {
                    return interaction.editReply('⚠️ Debes especificar al menos un campo para actualizar (nombre, precio, descripción o emoji).');
                }

                saveStore(store);

                const embed = new EmbedBuilder()
                    .setColor('#F1C40F')
                    .setTitle('🔄 Artículo Actualizado')
                    .setDescription(`El artículo **${item.nombre}** (ID: \`${id}\`) ha sido modificado.`)
                    .addFields({ name: 'Nuevo Precio', value: `\`${item.precio}\``, inline: true });

                return interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'eliminar') {
                const id = interaction.options.getString('id').toLowerCase().replace(/\s/g, '_');
                const initialLength = store.items.length;
                
                store.items = store.items.filter(item => item.id !== id);
                
                if (store.items.length === initialLength) {
                    return interaction.editReply(`❌ No se encontró ningún artículo con ID \`${id}\`.`);
                }

                saveStore(store);
                
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🗑️ Artículo Eliminado')
                    .setDescription(`El artículo con ID \`${id}\` ha sido eliminado de la tienda.`);
                
                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error en /gestionar-tienda:', error);
            return interaction.editReply('❌ Ocurrió un error interno al gestionar la tienda.');
        }
    }
};