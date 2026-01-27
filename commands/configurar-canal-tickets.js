const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('configurar-canal-tickets')
    .setDescription('Configura el canal de tickets para los botones de compra')
    .addChannelOption(opt => opt.setName('canal').setDescription('Canal de tickets').setRequired(true)),
  async execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
      return interaction.reply({ content: 'Solo administradores pueden configurar el canal.', ephemeral: true });
    }
    const canal = interaction.options.getChannel('canal');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    config.canalTicketsId = canal.id;
    config.serverId = interaction.guild.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    await interaction.reply({ content: `Canal de tickets configurado: <#${canal.id}>`, ephemeral: true });
  }
};
