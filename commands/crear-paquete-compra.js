const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { addPaquete } = require('../utils/paquetes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('crear-paquete-compra')
    .setDescription('Crea un paquete de compra de dinero')
    .addStringOption(opt => opt.setName('titulo').setDescription('Título del paquete').setRequired(true))
    .addStringOption(opt => opt.setName('descripcion').setDescription('Descripción del paquete').setRequired(true))
    .addNumberOption(opt => opt.setName('valor').setDescription('Valor del paquete').setRequired(true))
    .addStringOption(opt => opt.setName('moneda').setDescription('robux o dolares').setRequired(true).addChoices(
      { name: 'robux', value: 'robux' },
      { name: 'dolares', value: 'dolares' }
    ))
    .addStringOption(opt => opt.setName('imagen').setDescription('URL de la imagen').setRequired(false)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Solo administradores pueden crear paquetes.', ephemeral: true });
    }
    const titulo = interaction.options.getString('titulo');
    const descripcion = interaction.options.getString('descripcion');
    const valor = interaction.options.getNumber('valor');
    const moneda = interaction.options.getString('moneda');
    const imagen = interaction.options.getString('imagen') || '';
    const paquete = { titulo, descripcion, valor, moneda, imagen };
    addPaquete(paquete);
    await interaction.reply({ content: `Paquete creado: ${titulo}`, ephemeral: true });
  }
};
