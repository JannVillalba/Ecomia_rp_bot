const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
const { getPaquetes } = require('../utils/paquetes');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('comprar-dinero')
    .setDescription('Muestra los paquetes de compra disponibles'),
  async execute(interaction) {
    const paquetes = getPaquetes();
    if (!paquetes.length) {
      return interaction.reply({ content: 'No hay paquetes disponibles.', ephemeral: true });
    }
    // Leer config para obtener canal y server
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../config.json');
    let config = {};
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    const canalTicketsId = config.canalTicketsId || 'ID_CANAL_TICKETS';
    const serverId = config.serverId || interaction.guild.id;
    for (const paquete of paquetes) {
      const embed = new EmbedBuilder()
        .setTitle(paquete.titulo)
        .setDescription(paquete.descripcion + `\nValor: ${paquete.valor} ${paquete.moneda}`)
        .setColor(0x00AE86);
      if (paquete.imagen) embed.setImage(paquete.imagen);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`comprar_${paquete.id}`)
          .setLabel('Comprar')
          .setStyle(ButtonStyle.Success)
      );
      await interaction.channel.send({ embeds: [embed], components: [row] });
    }
    await interaction.reply({ content: 'Paquetes enviados. Haz clic en "Comprar" para iniciar tu solicitud.', ephemeral: true });
  },

  async handleButton(interaction) {
    // Solo manejar botones de compra
    if (!interaction.customId.startsWith('comprar_')) return;
    const paqueteId = parseInt(interaction.customId.replace('comprar_', ''));
    const { getPaquetes } = require('../utils/paquetes');
    const paquete = getPaquetes().find(p => p.id === paqueteId);
    if (!paquete) return interaction.reply({ content: 'Paquete no encontrado.', ephemeral: true });

    // Verificar si el usuario ya tiene un canal de compra abierto
    const categoriaId = '1460692126453993584';
    const rolId = '1460691590954615010';
    const rolAsuntosInternos = '1460691590954615010'; // Usa el mismo ID si es el rol correcto
    const nombreCanal = `compra-${interaction.user.username}`;
    const canalesCategoria = interaction.guild.channels.cache.filter(c => c.parentId === categoriaId && c.type === 0);
    const canalExistente = canalesCategoria.find(c => c.name === nombreCanal);
    if (canalExistente) {
      return interaction.reply({ content: `Ya tienes un canal de compra abierto: <#${canalExistente.id}>`, ephemeral: true });
    }

    // Crear canal privado en la categoría
    const permissionOverwrites = [
      {
        id: interaction.guild.id,
        deny: ['ViewChannel']
      },
      {
        id: interaction.user.id,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
      },
      {
        id: rolId,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
      }
    ];
    // Si el rol de asuntos internos es diferente, agregarlo
    if (rolAsuntosInternos !== rolId) {
      permissionOverwrites.push({
        id: rolAsuntosInternos,
        allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory']
      });
    }
    const canal = await interaction.guild.channels.create({
      name: nombreCanal,
      type: 0, // 0 = GUILD_TEXT
      parent: categoriaId,
      permissionOverwrites
    });
    await canal.send({ content: `Hola <@${interaction.user.id}>, ¿qué paquete deseas comprar? <@&${rolAsuntosInternos}>`,
      embeds: [
        new EmbedBuilder()
          .setTitle(paquete.titulo)
          .setDescription(paquete.descripcion + `\nValor: ${paquete.valor} ${paquete.moneda}`)
          .setColor(0x00AE86)
          .setImage(paquete.imagen || null)
      ]
    });
    await interaction.reply({ content: `Se ha creado tu canal de compra: <#${canal.id}>`, ephemeral: true });
  }
  }
; 
