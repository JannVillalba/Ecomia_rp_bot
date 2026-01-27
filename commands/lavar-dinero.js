const { 
    SlashCommandBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    ContainerBuilder, // V2 Component
    TextDisplayBuilder, // V2 Component
    SeparatorBuilder, // V2 Component
    // Eliminamos la importación de SeparatorSpacingSize, ya que estaba dando error.
    MessageFlags // Necesario para el modo V2
} = require('discord.js');

const Economia = require('../models/Economia'); // Asegúrate de que esta ruta sea correcta

// Función de formato de moneda
const FORMATO_MONEDA = (cantidad) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(cantidad);
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('lavar-dinero')
        .setDescription('Lava tus fondos ilegales y transfiérelos a tu cartera, pagando una comisión del 15%.'),
    async execute(interaction) {
        // Deferir la respuesta de la interacción
        await interaction.deferReply({ ephemeral: false });

        let usuarioEconomia = await Economia.findOne({ where: { discordId: interaction.user.id } });

        if (!usuarioEconomia || usuarioEconomia.ilegal <= 0) {
            return interaction.editReply('❌ No tienes fondos ilegales para lavar.');
        }

        const fondosIlegales = usuarioEconomia.ilegal;
        const COMISION_PORCENTAJE = 0.15; // 15%
        
        // -----------------------------------------------------------------
        // PASO 1 y 2: Menú Inicial (Container V2)
        // -----------------------------------------------------------------
        const opcionesBotones = [];
        const cantidadesPredefinidas = [0.10, 0.25, 0.50, 0.75]; 
        
        cantidadesPredefinidas.forEach((porcentaje) => {
            const cantidad = Math.floor(fondosIlegales * porcentaje);
            if (cantidad > 0) {
                opcionesBotones.push(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Primary)
                        .setLabel(`${porcentaje * 100}% (${FORMATO_MONEDA(cantidad)})`)
                        .setCustomId(`lavar_${cantidad}`)
                );
            }
        });
        
        if (fondosIlegales > 0) {
              opcionesBotones.push(
                  new ButtonBuilder()
                      .setStyle(ButtonStyle.Success)
                      .setLabel(`Lavar TODO (${FORMATO_MONEDA(fondosIlegales)})`)
                      .setCustomId(`lavar_${fondosIlegales}`)
              );
        }

        if (opcionesBotones.length === 0) { 
              return interaction.editReply(`❌ Tus fondos ilegales (${FORMATO_MONEDA(fondosIlegales)}) son demasiado bajos para el lavado.`);
        }

        const actionRows = [];
        let tempRow = new ActionRowBuilder();
        for (let i = 0; i < opcionesBotones.length; i++) {
            tempRow.addComponents(opcionesBotones[i]);
            if (tempRow.components.length === 5 || i === opcionesBotones.length - 1) {
                actionRows.push(tempRow);
                tempRow = new ActionRowBuilder();
            }
        }
        
        const container = new ContainerBuilder()
            .setAccentColor(0x3498DB) // Azul para la selección
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent("## 🧼 Servicio de Limpieza de Fondos 💸"),
            )
            .addSeparatorComponents(
                // 🟢 CORRECCIÓN: SeparatorSpacingSize.Small => 1
                new SeparatorBuilder().setSpacing(1).setDivider(false) 
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`Tus fondos ilegales ascienden a **${FORMATO_MONEDA(fondosIlegales)}**.`),
                new TextDisplayBuilder().setContent(`Comisión fija: **${COMISION_PORCENTAJE * 100}%**. Elige la cantidad a lavar:`)
            );
            
        actionRows.forEach(row => {
            container.addActionRowComponents(row);
        });

        const message = await interaction.editReply({ 
            components: [container],
            flags: MessageFlags.IsComponentsV2 
        });


        // -----------------------------------------------------------------
        // PASO 3: Recolector de Botones
        // -----------------------------------------------------------------
        const collectorFilter = i => i.customId.startsWith('lavar_') && i.user.id === interaction.user.id;
        const collector = message.createMessageComponentCollector({ filter: collectorFilter, time: 60000 });

        collector.on('collect', async i => {
            await i.deferUpdate();
            collector.stop();

            const customIdParts = i.customId.split('_');
            const cantidadALavar = parseInt(customIdParts[1]);
            
            if (isNaN(cantidadALavar) || cantidadALavar <= 0 || cantidadALavar > usuarioEconomia.ilegal) {
                return i.editReply({ 
                    content: '❌ Cantidad no válida para lavar o excede tus fondos.', 
                    components: [], 
                    embeds: [],
                    flags: MessageFlags.None
                });
            }

            const comision = Math.floor(cantidadALavar * COMISION_PORCENTAJE); // 15%
            const gananciaNeta = cantidadALavar - comision;

            // -----------------------------------------------------------------
            // PASO 4: Simulación de Carga (Container V2 de progreso)
            // -----------------------------------------------------------------
            
            const containerCarga = new ContainerBuilder()
                .setAccentColor(0xF1C40F) // Amarillo para progreso
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## ⌛ Procesando el Flujo de Capital...")
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`Moviendo **${FORMATO_MONEDA(cantidadALavar)}** por los canales 'legales'.`)
                )
                .addSeparatorComponents(
                    // 🟢 CORRECCIÓN: SeparatorSpacingSize.Small => 1
                    new SeparatorBuilder().setSpacing(1).setDivider(true), 
                )
                // Bloque de Progreso Simplificado y Separado
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("```ansi\n[0;33m[████████░░░░░░░░░░░░░░] 40%[0m\n```"),
                    new TextDisplayBuilder().setContent("**Clasificando Origen...**")
                )
                .addSeparatorComponents(
                    // 🟢 CORRECCIÓN: SeparatorSpacingSize.ExtraSmall no es necesario, usamos 0 o 1. Usaremos 1 (Small) para un ligero espacio.
                    new SeparatorBuilder().setSpacing(1).setDivider(false), 
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("*El proceso requiere verificación fiscal. ¡Espera un momento!*")
                );
                
            
            // Usamos interaction.editReply para mayor estabilidad
            await interaction.editReply({ 
                components: [containerCarga],
                flags: MessageFlags.IsComponentsV2,
                embeds: []
            });

            await new Promise(resolve => setTimeout(resolve, 3000)); 
            
            // -----------------------------------------------------------------
            // PASO 5: Finalización de la Transacción (Container V2)
            // -----------------------------------------------------------------
            
            // Actualización de la base de datos
            usuarioEconomia.ilegal -= cantidadALavar;
            usuarioEconomia.cartera += gananciaNeta;
            
            try {
                await usuarioEconomia.save();
            } catch (dbError) {
                console.error("Error al guardar la economía:", dbError);
                return interaction.followUp({ content: '❌ Error interno al guardar la transacción. Por favor, reporta este error.' });
            }

            const containerFinal = new ContainerBuilder()
                .setAccentColor(0x2ECC71) // Verde para éxito
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## ✅ Operación Exitosa: Fondos Lavados")
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`¡Tu dinero sucio ha sido "limpiado" y depositado en tu cartera!`)
                )
                .addSeparatorComponents(
                    // 🟢 CORRECCIÓN: SeparatorSpacingSize.Small => 1
                    new SeparatorBuilder().setSpacing(1).setDivider(true), 
                )
                // Bloque de Progreso Final (Fragmentado)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("```ansi\n[0;32m[██████████████████████] 100%[0m\n```"),
                    new TextDisplayBuilder().setContent("**Flujo Completado.**")
                )
                .addSeparatorComponents(
                    // 🟢 CORRECCIÓN: SeparatorSpacingSize.Small => 1
                    new SeparatorBuilder().setSpacing(1).setDivider(true), 
                )
                // Bloque de Montos (Fragmentado)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**💰 Monto Lavado:** \`\`\`${FORMATO_MONEDA(cantidadALavar)}\`\`\``)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**🔥 Comisión (${COMISION_PORCENTAJE * 100}%):** \`\`\`ansi\n[0;31m${FORMATO_MONEDA(comision)}[0m\`\`\``)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**✅ Ganancia Neta:** \`\`\`ansi\n[0;32m${FORMATO_MONEDA(gananciaNeta)}[0m\`\`\``)
                )
                .addSeparatorComponents(
                    // 🟢 CORRECCIÓN: SeparatorSpacingSize.Small => 1
                    new SeparatorBuilder().setSpacing(1).setDivider(true), 
                )
                // Bloque de Saldos Finales (Fragmentado)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**🏦 Nuevo Saldo Cartera:** ${FORMATO_MONEDA(usuarioEconomia.cartera)}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`**💸 Nuevo Saldo Ilegal:** ${FORMATO_MONEDA(usuarioEconomia.ilegal)}`)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`*Transacción completada: ${new Date().toLocaleString()}*`)
                );

            // 🧪 TIP DE DEPURACIÓN: Si ves esto en la consola, el error es el token de edición.
            console.log("Enviando mensaje de éxito (Container V2) al interaction.editReply...");

            // Intentamos la edición final, y si falla (por timeout), usamos followUp.
            try {
                await interaction.editReply({ 
                    components: [containerFinal], 
                    embeds: [],
                    flags: MessageFlags.IsComponentsV2 
                });
            } catch (editError) {
                console.error("❌ Fallo la edición final del interaction (token expirado o error API):", editError.message);
                // Si la edición falla, enviamos el resultado como un nuevo mensaje de seguimiento (fallback).
                interaction.followUp({ 
                    content: `✅ Transacción Completada: Se lavó **${FORMATO_MONEDA(cantidadALavar)}** (Neto: ${FORMATO_MONEDA(gananciaNeta)}). **(El mensaje original no se pudo editar)**`,
                    ephemeral: false
                });
            }
        });

        collector.on('end', async collected => {
            if (collected.size === 0) {
                // Limpia la respuesta en timeout.
                await interaction.editReply({ 
                    content: '❌ Tiempo de selección expirado. Vuelve a intentarlo.', 
                    components: [], 
                    embeds: [],
                    flags: MessageFlags.None
                }).catch(() => {});
            }
        });
    }
};