const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cerrar-compra')
    .setDescription('Cierra el canal de compra actual (solo asuntos internos)'),
  async execute(interaction) {
    const rolAsuntosInternos = '1460691590954615010'; // ID del rol de asuntos internos
    if (!interaction.member.roles.cache.has(rolAsuntosInternos)) {
      return interaction.reply({ content: 'Solo el rol de asuntos internos puede cerrar este canal.', ephemeral: true });
    }
    const canal = interaction.channel;
    // Verifica que el canal esté en la categoría de compras
    if (canal.parentId !== '1460692126453993584') {
      return interaction.reply({ content: 'Este comando solo puede usarse en canales de compra.', ephemeral: true });
    }
    await interaction.reply({ content: 'Canal de compra cerrado. Será eliminado en unos segundos.', ephemeral: true });
    setTimeout(() => canal.delete('Compra cerrada por asuntos internos'), 3000);
  }
};
