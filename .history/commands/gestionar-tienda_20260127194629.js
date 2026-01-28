const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const storePath = path.join(__dirname, '../../data/store.json');
const ADMIN_ROLE_ID = '1460691619836723515'; 

const saveStore = (storeData) => {
    fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2));
};

const loadStore = () => {
    if (!fs.existsSync(storePath)) {
        if (!fs.existsSync(path.dirname(storePath))) {
            fs.mkdirSync(path.dirname(storePath), { recursive: true });
        }
        fs.writeFileSync(storePath, JSON.stringify({ items: [] }, null, 2));
        return { items: [] };
    }
    return JSON.parse(fs.readFileSync(storePath, 'utf8'));
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gestionar-tienda')
        .setDescription('Comandos de administración para configurar los items de la tienda.')
        // --- SUBCOMANDO: AGREGAR ITEM (ID Automático) ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('agregar')
                .setDescription('Añade un nuevo artículo (El ID se genera automáticamente).')
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
                        .setDescription('Emoji para el artículo (ej: 🍔).')
                        .setRequired(true)))
        // --- SUBCOMANDO: ELIMINAR ITEM ---
        .addSubcommand(subcommand =>
            subcommand
                .setName('eliminar')
                .setDescription('Elimina un artículo usando su ID.')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('ID del artículo a eliminar.')
                        .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        if (!interaction.member.roles.cache.has(ADMIN_ROLE_ID)) {
            return interaction.editReply({ content: '❌ No tienes permisos de Administrador de Hacienda.' });
        }
        
        const subcommand = interaction.options.getSubcommand();
        let store = loadStore();

        try {
            if (subcommand === 'agregar') {
                const nombre = interaction.options.getString('nombre');
                const precio = interaction.options.getInteger('precio');
                const descripcion = interaction.options.getString('descripcion');
                const emoji = interaction.options.getString('emoji');

                // GENERACIÓN DE ID AUTOMÁTICO
                // Ejemplo: "Hamburgesa Doble" -> "hamburgesa_doble_1234"
                const baseId = nombre.toLowerCase()
                    .trim()
                    .replace(/\s+/g, '_') // Espacios por guiones bajos
                    .replace(/[^a-z0-9_]/g, ''); // Quitar símbolos raros
                
                const uniqueSuffix = Math.floor(Math.random() * 1000);
                const id = `${baseId}_${uniqueSuffix}`;

                if (precio <= 0) return interaction.editReply('❌ El precio debe ser mayor a 0.');

                const newItem = { id, nombre, precio, descripcion, emoji };
                store.items.push(newItem);
                saveStore(store);

                const embed = new EmbedBuilder()
                    .setColor('#2ECC71')
                    .setTitle('✅ Artículo Registrado')
                    .setThumbnail(interaction.guild.iconURL())
                    .addFields(
                        { name: '📦 Producto', value: `${emoji} ${nombre}`, inline: true },
                        { name: '💰 Precio', value: `$${precio}`, inline: true },
                        { name: '🆔 ID Generado', value: `\`${id}\``, inline: false },
                        { name: '📝 Info', value: descripcion }
                    )
                    .setFooter({ text: 'Usa este ID para eliminar el item si es necesario.' });
                
                return interaction.editReply({ embeds: [embed] });

            } else if (subcommand === 'eliminar') {
                const id = interaction.options.getString('id');
                const initialLength = store.items.length;
                
                store.items = store.items.filter(item => item.id !== id);
                
                if (store.items.length === initialLength) {
                    return interaction.editReply(`❌ No se encontró el ID: \`${id}\`. Revisa que esté bien escrito.`);
                }

                saveStore(store);
                
                return interaction.editReply({ 
                    content: `🗑️ Artículo con ID \`${id}\` eliminado correctamente de la base de datos.` 
                });
            }

        } catch (error) {
            console.error(error);
            return interaction.editReply('❌ Error al procesar la base de datos de la tienda.');
        }
    }
};