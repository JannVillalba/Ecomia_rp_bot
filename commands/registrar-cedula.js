// registrar-cedula.js

const {
    SlashCommandBuilder,
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    // Componentes V1 (para el log)
    EmbedBuilder,
    MessageFlags,
    // Warnings: Cambiar SelectMenuOptionBuilder por StringSelectMenuOptionBuilder (ya lo haces en V2)
    // Deprecation: Usar StringSelectMenuBuilder
} = require('discord.js');
const fetch = require('node-fetch'); // Importación necesaria
const Cedulas = require('../models/Cedula');

// --- CONSTANTES DE CONFIGURACIÓN ---
const REGISTRO_CHANNEL_ID = '1409090878936453180';
const ROL_NO_VERIFICADO_ID = '1409090693456203827';
const ROL_CIUDADANO_ID = '1409090691870621708';
const ROL_PERMISOS_BOT_ID = '1409114885769400422'; 
const LOG_CHANNEL_ID = '1409091007416631296'; 
const REGISTRADURIA_BANNER_URL = 'https://cdn.discordapp.com/attachments/1409549207613735002/1437917864525955132/registraduria-nacional-del-estado-civil-seeklogo.png?ex=6914fcde&is=6913ab5e&hm=5c9edf1bb4b3a6939f3ed0bc998ce83648e5b1c0e1a4c87e5aca3c55bc3fde28';

// Constantes de color y espaciado
const SEPARATOR_SPACING_SMALL = 1;
const COLOR_CARGA = 0xFFD700; // Amarillo oscuro
const COLOR_ERROR = 0xFF0000; // Rojo
const COLOR_EXITO = 0x00FF00; // Verde

// --- EMOJIS V2 (Tomados del JSON visual) ---
const EMOJI_VERIFIED = '<:26514verified:1445875150087000204>';
const EMOJI_ARROW_ANIMATED = '<a:3292arrowanimated:1447021118715068487>';
const EMOJI_PEN_AND_PAPER = '<a:papelylapiz:1445861826792259669>';
const EMOJI_USER = '<:76049user11:1442175091050942634>';
const EMOJI_ROBLOX = '<:61218roblox:1447030698991947888>';
const EMOJI_NATIONALITY = '<:42690wplace:1447030873559138335>';
const EMOJI_CALENDAR = '<:473488calender:1446271555213725718>';
const EMOJI_ID_STATUS = '<:308557status:1445202901025820722>';
const REGISTRADURIA_THUMBNAIL_URL = 'https://cdn.discordapp.com/attachments/1068711680718151803/1447029938657038376/idZrVaGKmo_logos.jpeg?ex=69362325&is=6934d1a5&hm=01ef49e7d713473657533f8d72944e0d57cf806bac3bb7fff508bb00027a9e2e';


/**
 * Crea el Container V2 para el mensaje de carga. (Efímero)
 */
function crearCargaContainer() {
    return new ContainerBuilder()
        .setAccentColor(COLOR_CARGA)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## 🔐 Procesando Solicitud...')
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `_Verificándose en **Bogotá RP**..._
                \`\`\`css
                [+] Verificando identidad de Roblox...
                [+] Conectando a la Registraduría Nacional...
                [+] Validando datos de identidad...
                \`\`\``
            )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('*Por favor, espera la confirmación. El proceso puede tomar unos segundos.*')
        );
}

/**
 * Crea el Container V2 para el mensaje de transición efímero.
 */
function crearTransicionContainer() {
    return new ContainerBuilder()
        .setAccentColor(COLOR_CARGA) 
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`✅ Proceso de registro finalizado. Enviando confirmación **pública**...`)
        );
}

/**
 * Crea el Container V2 para el mensaje de éxito (Respuesta Pública) según el JSON visual.
 * @param {object} interaction - El objeto de interacción.
 * @param {object} data - Los datos de la cédula.
 * @param {string} ciudadanoRoleName - El nombre del rol de Ciudadano.
 * @param {string} noVerificadoRoleName - El nombre del rol No Verificado.
 */
function crearExitoContainerPublico(interaction, data, ciudadanoRoleName, noVerificadoRoleName) {
    
    // Obtener el ID de la interacción original para el display ID
    const interactionIdDisplay = interaction.id.slice(-8); 
    
    // 🚨 CORRECCIÓN: Usar solo el nombre y ID en backticks para evitar el ping.
    const rolCiudadanoDisplay = `**\`${ciudadanoRoleName}\`** (\`${ROL_CIUDADANO_ID}\`)`;
    const rolNoVerificadoDisplay = `**\`${noVerificadoRoleName}\`** (\`${ROL_NO_VERIFICADO_ID}\`)`;
    
    const fechaRegistro = Math.floor(Date.now() / 1000);
    const tipoNacionalidad = data.nacionalidad.charAt(0).toUpperCase() + data.nacionalidad.slice(1);
    
    // El JSON Visual no usa EmbedBuilder, usa una estructura de ContainerBuilder pura.
    return new ContainerBuilder()
        .setAccentColor(COLOR_EXITO) // Color de éxito
        .addSectionComponents(
            // Bloque 1: Título y Thumbnail (Header)
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(REGISTRADURIA_THUMBNAIL_URL)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_VERIFIED} Felicidades, <@${interaction.user.id}>`),
                )
        )
        .addSeparatorComponents(
            // Separador
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        .addTextDisplayComponents(
            // Bloque 2: Mensaje de confirmación
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_ARROW_ANIMATED} La **Registraduría Nacional del Estado Civil**, se complace de anunciarte que tus datos fueron registrados en el sistema ${EMOJI_PEN_AND_PAPER}\n`
            )
        )
        .addSeparatorComponents(
            // Separador
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        .addTextDisplayComponents(
            // Bloque 3: Datos Registrados
            new TextDisplayBuilder().setContent(
                `## DATOS REGISTRADOS.\n\n` +
                `### ${EMOJI_USER} | Nombre: \`${data.nombres} ${data.apellidos}\`\n` +
                `### ${EMOJI_ROBLOX} | Username: \`${data.usuarioRoblox}\`\n` +
                `### ${EMOJI_NATIONALITY} | Nacionalidad: \`${tipoNacionalidad}\`\n` +
                `### ${EMOJI_CALENDAR} | F. Nacimiento: \`${data.fecha}\`\n` +
                `### ${EMOJI_ID_STATUS} | ID: \`#${interactionIdDisplay}\`\n\n`
            )
        )
        .addSeparatorComponents(
            // Separador
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        .addTextDisplayComponents(
            // Bloque 4: Roles y Fecha
            new TextDisplayBuilder().setContent(
                `## Roles Asignados: ${rolCiudadanoDisplay}\n\n` +
                `Se te retiró el rol: ${rolNoVerificadoDisplay}\n` +
                `## Fecha: <t:${fechaRegistro}:F>`
            )
        );
}

/**
 * Crea un Container V2 para un mensaje de error (Efímero).
 */
function crearErrorContainer(titulo, descripcion) {
    return new ContainerBuilder()
        .setAccentColor(COLOR_ERROR)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ❌ ${titulo}`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(descripcion)
        );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('registrar-cedula')
    .setDescription('Registra tu cédula de Bogotá RP')
    // ... (Opciones de comando)
    .addStringOption(opt =>
      opt.setName('nombres')
        .setDescription('Tus nombres completos.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('apellidos')
        .setDescription('Tus apellidos completos.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('fecha')
        .setDescription('Fecha de nacimiento (DD/MM/AAAA).')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('lugar')
        .setDescription('Lugar de nacimiento.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('usuario_roblox')
        .setDescription('Tu usuario de Roblox.')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('genero')
        .setDescription('Tu género.')
        .setRequired(true)
        .addChoices(
          { name: 'Masculino', value: 'Masculino' },
          { name: 'Femenino', value: 'Femenino' },
        )
    )
    .addStringOption(opt =>
      opt.setName('tipo_sangre')
        .setDescription('Tu tipo de sangre.')
        .setRequired(true)
        .addChoices(
          { name: 'O+', value: 'O+' },
          { name: 'O-', value: 'O-' },
          { name: 'A+', value: 'A+' },
          { name: 'A-', value: 'A-' },
          { name: 'B+', value: 'B+' },
          { name: 'B-', value: 'B-' },
          { name: 'AB+', value: 'AB+' },
          { name: 'AB-', value: 'AB-' }
        )
    )
    .addStringOption(opt =>
      opt.setName('nacionalidad')
        .setDescription('Tu nacionalidad.')
        .setRequired(true)
        .addChoices(
          { name: 'Colombiano(a)', value: 'colombiana' },
          { name: 'Extranjero(a)', value: 'extranjera' }
        )
    ),

  async execute(interaction) {
    const initiatorMember = interaction.member;
    const canExecuteAnywhere = initiatorMember.roles.cache.has(ROL_PERMISOS_BOT_ID);

    // 🚨 Obtener los nombres de los roles
    const ciudadanoRole = interaction.guild.roles.cache.get(ROL_CIUDADANO_ID);
    const noVerificadoRole = interaction.guild.roles.cache.get(ROL_NO_VERIFICADO_ID);
    
    // Usamos el nombre del rol o un fallback si no se encuentra
    const ciudadanoRoleName = ciudadanoRole ? ciudadanoRole.name : 'Ciudadano';
    const noVerificadoRoleName = noVerificadoRole ? noVerificadoRole.name : 'No Verificado';

    // 🚨 Validación 1: Canal Restringido o Permiso Bot
    if (!canExecuteAnywhere && interaction.channelId !== REGISTRO_CHANNEL_ID) {
      // Usamos el mensaje V1 ya que es la primera respuesta del flujo de error inicial
      return interaction.reply({
        content: `❌ Este comando solo se puede usar en el canal de registro <#${REGISTRO_CHANNEL_ID}>, a menos que tengas el rol <@&${ROL_PERMISOS_BOT_ID}>.`,
        ephemeral: true
      });
    }

    const data = {
      discordId: interaction.user.id,
      nombres: interaction.options.getString('nombres'),
      apellidos: interaction.options.getString('apellidos'),
      fecha: interaction.options.getString('fecha'),
      lugar: interaction.options.getString('lugar'),
      usuarioRoblox: interaction.options.getString('usuario_roblox'),
      genero: interaction.options.getString('genero'),
      tipoSangre: interaction.options.getString('tipo_sangre'),
      nacionalidad: interaction.options.getString('nacionalidad')
    };

    // Validación 2: Formato de fecha (Efímero)
    const fechaRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!fechaRegex.test(data.fecha)) {
      const errorContainer = crearErrorContainer('Formato Inválido', '❌ Formato de fecha incorrecto. Debe ser DD/MM/AAAA.');
      // Respuesta de error inicial efímera (Se usa reply, no deferir)
      return interaction.reply({
          components: [errorContainer],
          content: '',
          flags: MessageFlags.IsComponentsV2,
          ephemeral: true
      });
    }

    // 🚨 Deferir la respuesta efímera para el mensaje de carga (ya que es la primera respuesta exitosa)
    await interaction.deferReply({ ephemeral: true });

    // Validación 3: Existencia de cédula (Efímero)
    const cedulaExistente = await Cedulas.findOne({ where: { discordId: data.discordId } });
    if (cedulaExistente) {
      const errorContainer = crearErrorContainer(
          'Registro Existente',
          '⚠️ Ya tienes una cédula registrada. Si deseas actualizarla, usa el comando `/actualizar-cedula`.'
      );
      // Usar editReply porque ya se hizo deferReply
      return interaction.editReply({
          components: [errorContainer],
          content: '',
          flags: MessageFlags.IsComponentsV2,
          // ephemeral: true (ya está implícito en el deferReply)
      });
    }

    // --- Carga V2 (Efímero) ---
    const loadingContainer = crearCargaContainer();
    // Usar editReply (siguiendo el flujo: defer -> carga)
    await interaction.editReply({ 
        components: [loadingContainer], 
        content: '', 
        flags: MessageFlags.IsComponentsV2 
    });

    try {
      // Validar si el usuario de Roblox existe
      const resUser = await fetch("https://users.roblox.com/v1/usernames/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [data.usuarioRoblox] })
      }).then(r => r.json());

      if (!resUser.data || resUser.data.length === 0) {
        // Error V2: Usuario de Roblox no válido (Efímero)
        const errorContainer = crearErrorContainer(
            'Error en el Registro', 
            'El usuario de Roblox proporcionado no existe o no es válido.'
        );
        // Usar editReply
        return interaction.editReply({ 
            components: [errorContainer], 
            content: '', 
            flags: MessageFlags.IsComponentsV2,
            // ephemeral: true (ya está implícito en el deferReply)
        });
      }

      // Simular un tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 🟢 PROCESAMIENTO DE ROLES Y NICKNAME
      if (initiatorMember) {
          try {
              // 1. Remover rol No Verificado
              if (initiatorMember.roles.cache.has(ROL_NO_VERIFICADO_ID)) {
                  await initiatorMember.roles.remove(ROL_NO_VERIFICADO_ID, 'Registro de cédula completado.');
              }
              
              // 2. Asignar rol Ciudadano
              if (!initiatorMember.roles.cache.has(ROL_CIUDADANO_ID)) {
                  await initiatorMember.roles.add(ROL_CIUDADANO_ID, 'Registro de cédula completado.');
              }
              
              // 3. CAMBIAR NICKNAME AL USUARIO DE ROBLOX
              // Verificar si el bot tiene permiso para cambiar el nickname
              if (initiatorMember.manageable) {
                // Solo cambiar si el nickname actual no es el usuario de Roblox
                if ((initiatorMember.nickname || initiatorMember.user.username) !== data.usuarioRoblox) {
                    await initiatorMember.setNickname(data.usuarioRoblox, 'Registro de cédula: Nickname ajustado a usuario de Roblox.');
                }
              } else {
                 console.warn(`[REGISTRO] No se pudo cambiar el nickname de ${initiatorMember.user.tag}. Permisos insuficientes o rol superior.`);
              }

          } catch (roleError) {
              console.error(`[REGISTRO] Error al manejar roles/nickname para ${initiatorMember.user.tag}:`, roleError);
          }
      }

      // Registrar la cédula en la base de datos
      await Cedulas.create(data);

      // 🎯 RESPUESTA FINAL PÚBLICA
      
      // 1. Editamos la respuesta efímera de transición
      const transitionContainer = crearTransicionContainer();
      // Usar editReply para la transición
      await interaction.editReply({ 
          content: '', 
          components: [transitionContainer],
          flags: MessageFlags.IsComponentsV2, 
          // ephemeral: true (ya está implícito en el deferReply)
      });
      
      // 2. Enviamos la respuesta de éxito de forma PÚBLICA
      const successContainer = crearExitoContainerPublico(interaction, data, ciudadanoRoleName, noVerificadoRoleName);

      // 🚨 Usamos interaction.followUp para enviar un mensaje no-efímero después de una respuesta/defer efímera.
      await interaction.followUp({
          components: [successContainer],
          content: '', // El mensaje V2 no usa contenido
          flags: MessageFlags.IsComponentsV2,
          ephemeral: false // ¡Este mensaje es público!
      });


      // --- Log Público (EmbedBuilder + Banner) ---
      const publicLogEmbed = new EmbedBuilder()
          .setColor(COLOR_EXITO)
          .setTitle(`✅ Registro Exitoso de Cédula`)
          .setDescription(`**${initiatorMember.displayName}** (<@${interaction.user.id}>) ha completado su registro y ahora es un ciudadano.`)
          .setThumbnail(interaction.user.displayAvatarURL())
          .setImage(REGISTRADURIA_BANNER_URL)
          // 🚨 NOTA: Los Embeds no hacen ping a los roles si solo se usa el nombre.
          .addFields(
              { name: 'Ciudadano', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Usuario Roblox', value: `\`${data.usuarioRoblox}\``, inline: true },
              { name: 'Tipo', value: data.nacionalidad.charAt(0).toUpperCase() + data.nacionalidad.slice(1), inline: true },
              { name: 'Rol Asignado', value: `\`${ciudadanoRoleName}\``, inline: false }
          )
          .setTimestamp();
          
      const logChannel = interaction.client.channels.cache.get(LOG_CHANNEL_ID);
      if (logChannel) {
          logChannel.send({ embeds: [publicLogEmbed] }).catch(err => console.error('Error al enviar log público:', err));
      }


    } catch (error) {
      console.error(error);
      
      // Error V2: Error genérico (Efímero)
      const errorContainer = crearErrorContainer(
        'Error en el Registro', 
        'Ocurrió un error al intentar registrar tu cédula. Intenta de nuevo más tarde.'
      );
        
      // Usar editReply (porque ya se hizo deferReply)
      await interaction.editReply({ 
          components: [errorContainer], 
          content: '', 
          flags: MessageFlags.IsComponentsV2,
          // ephemeral: true (ya está implícito en el deferReply)
      });
    }
  }
};