const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags 
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Economia = require('../models/Economia');

// ID del canal permitido para este comando
const ALLOWED_CHANNEL_ID = '1460692332545310813';
const SEPARATOR_SPACING_SMALL = 1;

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cantidad);
};

// Función para simular un retraso
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// --------------------------------------------------------------------------------
// FUNCIÓN DE CREACIÓN DE CONTAINERS V2 (RESULTADO)
// --------------------------------------------------------------------------------

function crearSaldoContainer(targetUser, economia, attachmentFileName) {
    const container = new ContainerBuilder()
        .setAccentColor(3066993) // Azul para un reporte financiero
        
        // Título Principal
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## 📊 REPORTE DE SALDO - ${targetUser.username}`)
        )
        
        // Separador
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )

        // Saldo en Cartera (Verde)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**💵 Cartera (Dinero en Mano)**\n\`\`\`ansi\n[2;32m${formatoMoneda(economia.cartera)}[0m\n\`\`\``)
        )
        // Saldo en Banco (Azul)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**🏦 Banco**\n\`\`\`ansi\n[2;34m${formatoMoneda(economia.banco)}[0m\n\`\`\``)
        )
        // Fondos Ilegales (Rojo/Negro)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**💀 Fondos Ilegales**\n\`\`\`ansi\n[2;30m${formatoMoneda(economia.ilegal)}[0m\n\`\`\``)
        )

        // Separador antes de la imagen
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )

        // Imagen generada (Parte más exótica)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(`attachment://${attachmentFileName}`)
                )
        )
        
        // Pie de página (timestamp)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Reporte generado a las <t:${Math.floor(Date.now() / 1000)}:T>*`)
        );
        
    return container;
}


// --------------------------------------------------------------------------------
// EXPORTACIÓN DEL COMANDO
// --------------------------------------------------------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Muestra tu saldo o el de otro usuario.')
        .addUserOption(option =>
            option.setName('usuario')
                .setDescription('El usuario del que quieres ver el saldo. (Opcional)')
                .setRequired(false)
        ),
    async execute(interaction) {
        // Verificar si el comando se ejecutó en el canal permitido
        if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
            // El mensaje de error no requiere V2, content es suficiente.
            await interaction.reply({ content: `❌ Este comando solo puede ser usado en el canal de <#${ALLOWED_CHANNEL_ID}>.`, flags: MessageFlags.Ephemeral });
            return;
        }

        if (!interaction.deferred && !interaction.replied) {
            await interaction.deferReply({ flags: 0 });
        }

        try {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;

            // --- Mensajes de Carga V2 (Más estético) ---
            const loadingContainer = new ContainerBuilder()
                .setAccentColor(16776960) // Amarillo
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## 🔐 ACCESO A DATOS BANCARIOS')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('```ini\n🔎 Buscando el saldo de ' + targetUser.username + '...\n```')
                );
            
            await interaction.editReply({ 
                components: [loadingContainer], 
                content: '',
                flags: MessageFlags.IsComponentsV2 
            });
            await sleep(1000);
            
            loadingContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('```css\n[+] Solicitando acceso de clave dinámica...\n```')
            );
            await interaction.editReply({ components: [loadingContainer], content: '', flags: MessageFlags.IsComponentsV2 });
            await sleep(1000);

            loadingContainer.addTextDisplayComponents(
                new TextDisplayBuilder().setContent('```ini\n[*] Clave verificada. Generando reporte de seguridad...\n```')
            );
            await interaction.editReply({ components: [loadingContainer], content: '', flags: MessageFlags.IsComponentsV2 });
            await sleep(1000);

            // --- Lógica Principal (Base de datos y Canvas) ---
            let usuarioEconomia = await Economia.findOne({ where: { discordId: targetUser.id } });
            if (!usuarioEconomia) {
                usuarioEconomia = await Economia.create({ discordId: targetUser.id });
            }

            const imagenBase = await loadImage('./assets/saldo.png');
            const canvas = createCanvas(imagenBase.width, imagenBase.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(imagenBase, 0, 0, canvas.width, canvas.height);

            // 🚨 AJUSTES DE COORDENADAS Y FUENTE PARA IMAGEN PEQUEÑA (8 píxeles de alto)
            ctx.font = 'bold 44px "Arial"'; // Aumentar tamaño de fuente para mejor visibilidad
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle'; // Centrar verticalmente
            
            // Coordenadas aproximadas basadas en el mapeo:
            // Cartera: coords="564,516,864,542" -> Centro X: (564+864)/2 = 714. Centro Y: (516+542)/2 = 529
            // Banco: coords="555,679,868,702" -> Centro X: (555+868)/2 = 711.5. Centro Y: (679+702)/2 = 690.5
            // Ilegales: coords="556,839,892,862" -> Centro X: (556+892)/2 = 724. Centro Y: (839+862)/2 = 850.5

            // mapeo desactualizado, nuevas coordenadas:

            const centerX_Cartera = 674; 
            const centerY_Cartera = 640; 

            const centerX_Banco = 650;   
            const centerY_Banco = 820; 

            const centerX_Ilegales = 670; 
            const centerY_Ilegales = 1000;
            // Cartera
            ctx.fillStyle = '#222'; // Gris oscuro para contraste
            ctx.fillText(formatoMoneda(usuarioEconomia.cartera), centerX_Cartera, centerY_Cartera);

            // Banco
            ctx.fillStyle = '#222'; // Gris oscuro para contraste
            ctx.fillText(formatoMoneda(usuarioEconomia.banco), centerX_Banco, centerY_Banco);

            // Fondos Ilegales
            ctx.fillStyle = '#222'; // Gris oscuro para contraste
            ctx.fillText(formatoMoneda(usuarioEconomia.ilegal), centerX_Ilegales, centerY_Ilegales);

            const attachmentFileName = 'saldo.png';
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: attachmentFileName });
            
            // --- Respuesta Final V2 (Usando ContainerBuilder) ---
            const finalContainer = crearSaldoContainer(targetUser, usuarioEconomia, attachmentFileName);

            // Enviamos la respuesta final, haciéndola pública.
            await interaction.editReply({ 
                content: '', // Obligatorio vacío para V2
                components: [finalContainer], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2
            });

        } catch (error) {
            console.error('[Error en Comando Saldo]:', error);
            // El manejo de errores debe ser efímero y sin V2 para asegurar que se muestre.
            await interaction.editReply({ content: '❌ Ocurrió un error al procesar tu solicitud de saldo. Revisa la consola.', flags: MessageFlags.Ephemeral, components: [] });
        }
    }
};