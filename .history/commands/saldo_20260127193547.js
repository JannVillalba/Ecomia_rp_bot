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

const formatoMoneda = (cantidad) => {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        minimumFractionDigits: 2,
    }).format(cantidad);
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function crearSaldoContainer(targetUser, economia, attachmentFileName) {
    // Verificar si tiene cuenta grabada en la DB
    const tieneCuenta = economia.bancoNombre && economia.bancoNombre !== "Ninguno";
    
    const container = new ContainerBuilder()
        .setAccentColor(16448250) 
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## <:5526iconbank:1465809664859050249> ESTADO FINANCIERO - ${targetUser.username}`)
        )
        
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))

        // --- CONEXIÓN CON CREAR-CUENTA ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### <:5526iconbank:1465809664859050249> SERVICIOS BANCARIOS\n` +
                (tieneCuenta 
                    ? `> **Institución:** \`${economia.bancoNombre}\`\n> **Tipo:** \`${economia.cuentaTipo}\`\n> **Estado:** \`ACTIVA\``
                    : `> <a:71227checkno:1444377968171286622> **Sin cuenta activa.**\n> *Usa \`/crear-cuenta\` para registrarte.*`)
            )
        )

        .addSeparatorComponents(new SeparatorBuilder().setDivider(false))

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
        .setDescription('Consulta tu estado de cuenta y efectivo.')
        .addUserOption(option => 
            option.setName('usuario')
                .setDescription('Ver el saldo de alguien más.')
                .setRequired(false)),

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

            // 2. Simular carga
            const loading = new ContainerBuilder()
                .setAccentColor(16448250)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('## <a:9927apilatency1:1444379371753308372> ACCEDIENDO A LA RED SWIFT...'))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('```\n[||||||    ] Sincronizando con Banco Central...\n```'));
            
            await interaction.editReply({ components: [loading], flags: [MessageFlags.IsComponentsV2] });
            await sleep(1000);

            // 3. Generar Canvas
            const imagenBase = await loadImage('./assets/saldo.png');
            const canvas = createCanvas(imagenBase.width, imagenBase.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imagenBase, 0, 0, canvas.width, canvas.height);

            ctx.font = 'bold 44px "Arial"';
            ctx.fillStyle = '#222';
            ctx.textAlign = 'center';

            ctx.fillText(formatoMoneda(usuarioEco.cartera), 674, 640);
            ctx.fillText(formatoMoneda(usuarioEco.banco), 650, 820);
            ctx.fillText(formatoMoneda(usuarioEco.ilega), 670, 1000);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'saldo.png' });
            const finalContainer = crearSaldoContainer(targetUser, usuarioEco, 'saldo.png');

            await interaction.editReply({ 
                components: [finalContainer], 
                files: [attachment],
                flags: [MessageFlags.IsComponentsV2]
            });

        } catch (error) {
            console.error(error);
            await interaction.editReply({ content: '❌ Error al sincronizar con la red bancaria.' });
        }
    }
};