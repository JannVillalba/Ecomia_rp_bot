const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cantidad);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('add-item')
        .setDescription('Añade un artículo a la tienda (Solo para administradores).')
        .addStringOption(option =>
            option.setName('nombre')
                .setDescription('El nombre del artículo.')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('precio')
                .setDescription('El precio del artículo.')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('emoji')
                .setDescription('Un emoji para el artículo (ej: 💎).')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('descripcion')
                .setDescription('Una breve descripción del artículo.')
                .setRequired(false))
        .addRoleOption(option => // Nueva opción para el rol
            option.setName('rol')
                .setDescription('El rol que este ítem le dará al usuario.')
                .setRequired(false)),
    async execute(interaction) {
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', ephemeral: true });
        }

        const nombre = interaction.options.getString('nombre');
        const precio = interaction.options.getInteger('precio');
        const emoji = interaction.options.getString('emoji');
        const descripcion = interaction.options.getString('descripcion') || 'Sin descripción.';
        const rol = interaction.options.getRole('rol');

        const storePath = path.join(__dirname, '../data/store.json');
        let store = { items: [] };

        if (fs.existsSync(storePath)) {
            store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
        } else {
            const dataDir = path.join(__dirname, '../data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir);
            }
        }

        const newItem = {
            id: uuidv4(),
            nombre,
            precio,
            emoji,
            descripcion,
            rolId: rol ? rol.id : null // Guardar el ID del rol si existe
        };

        store.items.push(newItem);
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2));

        await interaction.reply({
            content: `✅ El artículo **${nombre}** ha sido añadido a la tienda por ${formatoMoneda(precio)}.${rol ? `\nEste ítem otorga el rol **${rol.name}**.` : ''}`,
            ephemeral: true
        });
    }
};