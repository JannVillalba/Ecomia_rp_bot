const { 
    SlashCommandBuilder, 
    AttachmentBuilder, 
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    MessageFlags 
} = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const Economy = require('../models/Economia');
const fs = require('fs');
const path = require('path');

const ALLOWED_CHANNEL_ID = '1460692332545310813';
const configPath = path.join(__dirname, '../../data/bancos_config.json');

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
    }).format(cantidad);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para generar la visual V2
function crearSaldoContainer(targetUser, economia, attachmentFileName, bancoInfo) {
    const container = new ContainerBuilder()
        .setAccentColor(16448250) 
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## <:5526iconbank:1465809664859050249> ESTADO FINANCIERO - ${targetUser.username}`)
        )
        
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

        // Sección de Cuentas Activas
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### <:5526iconbank:1465809664859050249> SERVICIOS CONTRATADOS\n` +
                `> **Banco:** \`${bancoInfo.nombre}\`\n` +
                `> **Tipo de Cuenta:** \`${bancoInfo.tipo}\`\n` +
                `> **Rendimiento:** \`${bancoInfo.tasa}%\``
            )
        )

        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))

        // Valores en ANSI para colores en bloques de código
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**💵 Cartera**\n\`\`\`ansi\n[2;32m${formatoMoneda(economia.cartera)}[0m\n\`\`\``)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**🏦 Saldo Bancario**\n\`\`\`ansi\n[2;34m${formatoMoneda(economia.banco)}[0m\n\`\`\``)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**💀 Activos No Declarados**\n\`\`\`ansi\n[2;31m${formatoMoneda(economia.ilega)}[0m\n\`\`\``)
        )

        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(new MediaGalleryItemBuilder().setURL(`attachment://${attachmentFileName}`))
        )
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`*Corte de caja: <t:${Math.floor(Date.now() / 1000)}:f>*`)
        );
        
    return container;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saldo')
        .setDescription('Consulta tu estado de cuenta y efectivo.'),

    async execute(interaction) {
        if (interaction.channelId !== ALLOWED_CHANNEL_ID) {
            return interaction.reply({ 
                content: `❌ Acceso denegado. Consulta tu saldo en <#${ALLOWED_CHANNEL_ID}>.`, 
                flags: [MessageFlags.Ephemeral] 
            });
        }

        await interaction.deferReply();

        try {
            const targetUser = interaction.options.getUser('usuario') || interaction.user;
            
            // 1. Obtener Datos de la DB
            let usuarioEco = await Economy.findOne({ where: { discordId: targetUser.id } });
            if (!usuarioEco) {
                usuarioEco = await Economy.create({ discordId: targetUser.id });
            }

            // 2. Simular carga makial
            const loading = new ContainerBuilder()
                .setAccentColor(16448250)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:9927apilatency1:1444379371753308372> CONECTANDO CON LA RED BANCARIA...'))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('```\n[||||      ] Verificando identidad...\n```'));
            
            await interaction.editReply({ components: [loading], flags: [MessageFlags.IsComponentsV2] });
            await sleep(1500);

            // 3. Lógica de Banco (Simulada o desde config)
            // Aquí puedes implementar una lógica para saber qué cuenta tiene el usuario
            let bancoInfo = { nombre: "Ninguno", tipo: "Sin cuenta", tasa: 0 };
            
            // Ejemplo: Si el usuario tiene dinero en el banco, asumimos que tiene una cuenta básica
            if (usuarioEco.banco > 0) {
                bancoInfo = { nombre: "BBVA / Assesan", tipo: "Cuenta de Ahorros", tasa: 1.5 };
            }

            // 4. Generar Canvas
            const imagenBase = await loadImage('./assets/saldo.png');
            const canvas = createCanvas(imagenBase.width, imagenBase.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imagenBase, 0, 0, canvas.width, canvas.height);

            // Estilo de texto para la imagen
            ctx.font = 'bold 44px "Arial"';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';

            // Coordenadas ajustadas (según tu petición)
            ctx.fillText(formatoMoneda(usuarioEco.cartera), 674, 640);
            ctx.fillText(formatoMoneda(usuarioEco.banco), 650, 820);
            ctx.fillText(formatoMoneda(usuarioEco.ilega), 670, 1000);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'saldo.png' });
            const finalContainer = crearSaldoContainer(targetUser, usuarioEco, 'saldo.png', bancoInfo);

            await interaction.editReply({ 
                components: [finalContainer], 
                files: [attachment],
                flags: [MessageFlags.IsComponentsV2]
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Error al sincronizar con el banco.' });
        }
    }
};