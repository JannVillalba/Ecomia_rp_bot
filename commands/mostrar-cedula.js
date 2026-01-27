// commands/mostrar-cedula.js

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
const fetch = require('node-fetch'); 
const Cedula = require('../models/Cedula'); 

// --- CONSTANTES (SIN CAMBIOS) ---
const SEPARATOR_SPACING_SMALL = 1;
const SEPARATOR_SPACING_MEDIUM = 2; 
const COLOR_ERROR = 0xFF0000;
const CEDULA_IMAGE_PATH = './assets/plantilla-mexico-nuevolaredo-cedula.png'; 
const ALLOWED_CHANNEL_ID = '1409090985907982337'; 
const CANAL_IC_ID = '1409728378767937536'; // Canal IC/General para pings públicos

// --- FUNCIONES DE UTILIDAD (SIN CAMBIOS) ---

function generateCedulaId(nacionalidad) {
    let id = '';
    if ((nacionalidad ?? '').toLowerCase() === 'colombiana') {
        for (let i = 0; i < 10; i++) {
            id += Math.floor(Math.random() * 10);
        }
    } else {
        id += 'EXT-';
        for (let i = 0; i < 9; i++) {
            id += Math.floor(Math.random() * 10);
        }
    }
    return id;
}


function crearCedulaContainer(cedula, targetUser, fullName, tipoCedula, attachmentFileName, shouldPing) {
    const container = new ContainerBuilder()
        .setAccentColor(3092278); // GGriz
    
    // 1. TÍTULO PRINCIPAL (SIN PING AQUÍ)
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`## <:Card:1447007147832381551> ${tipoCedula} de ${fullName}`)
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
    )
    
    // Bloque 1: Imagen Generada
    .addMediaGalleryComponents(
        new MediaGalleryBuilder()
            .addItems(
                new MediaGalleryItemBuilder().setURL(`attachment://${attachmentFileName}`)
            )
    )
    
    // Separador antes del footer
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_MEDIUM).setDivider(true)
    );
    
    // 3. Footer con PING DENTRO DEL CONTENIDO V2 (Simulando la estructura del JSON)
    const footerContent = 
        `> <:discord_ico:1447007151569768608> *Discord:* \`${targetUser.tag}\` | *Roblox:* \`${cedula.usuarioRoblox}\``;
        
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(footerContent)
    );
    
    // Agregamos la línea del PING solo si es necesario (CANAL_IC_ID)
    if (shouldPing) {
         const pingContent = `> ||<@${targetUser.id}>|| | ID: ||***${targetUser.id}***||`;
         container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(pingContent)
        );
    }
        
    return container;
}

// --------------------------------------------------------------------------------
// FUNCIÓN PRINCIPAL DEL COMANDO (COORDENADAS Y FUENTES AJUSTADAS)
// --------------------------------------------------------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mostrar-cedula')
        .setDescription('Muestra tu cédula o la de otro usuario de México Nuevo Laredo [ER:LC].')
        .addUserOption(option =>
            option.setName('usuario')
            .setDescription('El usuario del que quieres ver la cédula. (Opcional)')
            .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: false });

        const targetUser = interaction.options.getUser('usuario') || interaction.user;

        try {
            const cedula = await Cedula.findOne({ where: { discordId: targetUser.id } });
            if (!cedula) {
                return interaction.editReply({
                    content: `❌ ${targetUser.username} no tiene una cédula registrada.`,
                    ephemeral: true, 
                    components: [],
                    flags: 0
                });
            }

            if (!cedula.cedulaId) {
                const newCedulaId = generateCedulaId(cedula.nacionalidad);
                await cedula.update({ cedulaId: newCedulaId });
                cedula.cedulaId = newCedulaId;
            }

            // --- 1. Obtener Avatar de Roblox (SIN CAMBIOS) ---
            const resUser = await fetch("https://users.roblox.com/v1/usernames/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usernames: [cedula.usuarioRoblox] })
            }).then(r => r.json());

            if (!resUser.data || resUser.data.length === 0) {
                return interaction.editReply({
                    content: '❌ El usuario de Roblox no pudo ser encontrado. Es posible que el nombre haya cambiado.',
                    ephemeral: true,
                    components: [],
                    flags: 0
                });
            }

            const userId = resUser.data[0].id;
            const resThumb = await fetch(
                `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
            ).then(r => r.json());

            const avatarUrl = resThumb.data[0].imageUrl;
            const avatarImage = await loadImage(avatarUrl);
            
            // --- 2. GENERACIÓN DE IMAGEN CON CANVAS (AJUSTES FINALES) ---
            const imagenBase = await loadImage(CEDULA_IMAGE_PATH);
            const canvas = createCanvas(imagenBase.width, imagenBase.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(imagenBase, 0, 0, canvas.width, canvas.height);

            // --- A. Dibujar Foto de Roblox ---
            ctx.drawImage(avatarImage, 79, 119, 286, 280); 

            // --- B. Dibujar Texto ---
            ctx.fillStyle = '#000000'; 
            ctx.textAlign = 'left';

            // 1. Nombre y Apellido (Mapa: 74, 468) -> Fuente 17px
            const fullName = `${cedula.nombres ?? ''} ${cedula.apellidos ?? ''}`;
            ctx.font = 'bold 17px "Arial"'; // Tamaño Final
            ctx.fillText(fullName.toUpperCase(), 74, 468); 

            // 2. ID de Cédula (Mapa: 122, 525) -> Fuente 22px
            ctx.font = 'bold 22px "Arial"'; // Tamaño Final
            ctx.fillText(cedula.cedulaId, 119, 521); // x ajustada a 119, y ajustada a 521

            // 3. Fecha de Nacimiento (Mapa: 563, 216)
            const fechaNac = (cedula.fecha ?? '').split('T')[0];
            ctx.font = 'bold 17px "Arial"';
            ctx.fillText(fechaNac, 584, 216); // x ajustada a 584

            // 4. Lugar Nacimiento (Mapa: 517, 246)
            const lugarNac = cedula.lugar ?? '';
            ctx.fillText(lugarNac.toUpperCase(), 523, 248); 

            // 5. Nacionalidad (Mapa: 604, 312)
            const nacionalidad = cedula.nacionalidad ?? '';
            ctx.fillText(nacionalidad.toUpperCase(), 604, 312); 

            // 6. Género (Mapa: 535, 345)
            const genero = cedula.genero ?? '';
            ctx.fillText(genero.toUpperCase(), 542, 345); 

            // 7. Tipo de Sangre (Rojo) (Mapa: 617, 400)
            ctx.fillStyle = '#FF0000'; 
            ctx.font = '28px "Arial"'; 
            const tipoSangre = cedula.tipoSangre ?? '';
            ctx.fillText(tipoSangre.toUpperCase(), 621, 412); // x ajustada a 618, y ajustada a 412


            // 3. Generar Attachment (SIN CAMBIOS)
            const attachmentFileName = 'cedula.png';
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: attachmentFileName });
            
            // --- 4. PREPARACIÓN DEL PING Y RESPUESTA FINAL V2 (AJUSTADA) ---
            
            const shouldPing = (interaction.channelId === CANAL_IC_ID); 
            const tipoCedula = (cedula.nacionalidad?.toLowerCase() === 'colombiana') ? 'Cédula de Ciudadanía' : 'Cédula de Extranjería';
            
            const finalContainer = crearCedulaContainer(cedula, targetUser, fullName, tipoCedula, attachmentFileName, shouldPing);

            await interaction.editReply({ 
                content: '',
                components: [finalContainer], 
                files: [attachment], 
                flags: MessageFlags.IsComponentsV2,
                ephemeral: false 
            });

        } catch (error) {
            console.error('[Error en Comando Cédula]:', error);
            
            // Contenedor de Error V2
            const errorContainer = new ContainerBuilder()
                .setAccentColor(COLOR_ERROR)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('## ❌ Error de Sistema')
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(error.message || 'Ocurrió un error al intentar mostrar la cédula. Revisa la consola o contacta a un administrador.')
                );

            await interaction.editReply({ 
                components: [errorContainer], 
                content: '', 
                flags: MessageFlags.IsComponentsV2, 
                ephemeral: true 
            });
        }
    }
};