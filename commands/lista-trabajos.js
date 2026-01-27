const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const config = require('../config.json');

// Formateador de moneda COP
const formatoMoneda = (cantidad) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lista-trabajos')
        .setDescription('Muestra la lista de trabajos configurados en el servidor.'),
    async execute(interaction) {
        await interaction.deferReply();

        try {
            const trabajos = Object.entries(config.jobs).map(([roleId, job]) => ({
                roleId,
                ...job
            }));

            if (trabajos.length === 0) {
                return interaction.editReply({
                    content: '❌ No hay trabajos configurados en este momento.'
                });
            }

            const itemsPorPagina = 5;
            const totalPaginas = Math.ceil(trabajos.length / itemsPorPagina);
            let paginaActual = 1;

            // Genera embed y botones
            const generarEmbedYBotones = async (pagina) => {
                const embed = new EmbedBuilder()
                    .setColor('#8e44ad')
                    .setTitle('📋 Expediente: Catálogo de Ocupaciones')
                    .setDescription('Oferta laboral de la ciudad con salarios y plazos de pago.')
                    .setThumbnail('https://media.discordapp.net/attachments/1409091007416631296/1415276239105404996/gY7V0M5h16cAAAAASUVORK5CYII.png')
                    .setFooter({ text: `Página ${pagina} de ${totalPaginas}` })
                    .setTimestamp();

                const inicio = (pagina - 1) * itemsPorPagina;
                const fin = inicio + itemsPorPagina;
                const trabajosPagina = trabajos.slice(inicio, fin);

                for (const job of trabajosPagina) {
                    let role = interaction.guild.roles.cache.get(job.roleId);
                    if (!role) {
                        try {
                            role = await interaction.guild.roles.fetch(job.roleId);
                        } catch (err) {
                            console.error(`No se pudo buscar el rol ${job.roleId}: ${err.message}`);
                            role = null;
                        }
                    }

                    const roleMention = role ? role.toString() : `Rol desconocido (${job.roleId})`;

                    embed.addFields({
                        // ⚡ El nombre ahora es solo texto plano, sin mención
                        name: `💼 ${job.nombre || 'Trabajo'}`,
                        // ⚡ La mención va dentro del value, que sí procesa menciones
                        value:
                            `**Rol:** ${roleMention}\n` +
                            `**Pago:** \`\`\`ansi\n\u001b[0;32m${formatoMoneda(job.dinero)}\u001b[0m\`\`\`\n` +
                            `**Periodo:** \`\`\`${job.tiempo} ${job.unidad}\`\`\``,
                        inline: false
                    });
                }

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pagina === 1),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(pagina === totalPaginas)
                );

                return { embeds: [embed], components: [buttons] };
            };

            const mensaje = await interaction.editReply(await generarEmbedYBotones(paginaActual));

            const collector = mensaje.createMessageComponentCollector({ time: 60000 });

            collector.on('collect', async i => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({
                        content: '❌ Solo la persona que ejecutó el comando puede cambiar de página.',
                        ephemeral: true
                    });
                }

                if (i.customId === 'next_page' && paginaActual < totalPaginas) {
                    paginaActual++;
                } else if (i.customId === 'prev_page' && paginaActual > 1) {
                    paginaActual--;
                }

                await i.update(await generarEmbedYBotones(paginaActual));
            });

            collector.on('end', async () => {
                const botonesDeshabilitados = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('prev_page')
                        .setLabel('⬅️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('next_page')
                        .setLabel('➡️')
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );
                await interaction.editReply({ components: [botonesDeshabilitados] });
            });

        } catch (error) {
            console.error('Error en el comando /lista-trabajos:', error);
            await interaction.editReply(
                '❌ Ocurrió un error al intentar obtener la lista de trabajos.'
            );
        }
    }
};
