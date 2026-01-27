    const {
    SlashCommandBuilder,
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    // Componentes V1/V2 compatibles (Mantenidos por si acaso)
    ActionRowBuilder,
    MessageFlags,
    ButtonBuilder,
    ButtonStyle,
    SectionBuilder,
    ThumbnailBuilder
} = require('discord.js');

// NOTA: Asumiendo que estos paths son correctos
const Cedula = require('../models/Cedula');
const Economia = require('../models/Economia');

// --- EMOJIS Y CONSTANTES PERSONALIZADAS DITRA ---
const CONVERSION_MULTA = 1000000; 
const SEPARATOR_SPACING_SMALL = 1; 

const EMOJI_ALERTA_ANIMADO = '<a:9697alert2:1445857524590055527>';
const EMOJI_CHECK_ANIMADO = '<a:71227checkyes:1442172457862561923>';
const EMOJI_USER = '<:76049user11:1442175091050942634>';
const EMOJI_POLICE = '<a:41330policeofficer:1445206207509041345>';
const EMOJI_PUNTO = '<:blackpoint:1445860239969882152>';
const EMOJI_PAPEL = '<:papel:1445861824556699880>';
const EMOJI_PAPEL_LAPIS = '<a:papelylapiz:1445861826792259669>';
const EMOJI_WEEWOO_RED = '<a:9892weewoored:1445807417651757208>';
const EMOJI_DITRA_LOGO = '<:Distintivo_de_la_Direccin_de_Trn:1445863404223856813>';
const EMOJI_ERROR_SIMPLE = '❌';

const DITRA_THUMBNAIL_URL = 'https://cdn.discordapp.com/attachments/1068711680718151803/1445858054036783196/Distintivo_de_la_Direccion_de_Transito_y_Transporte_Colombia.svg.png?ex=6931dfbe&is=69308e3e&hm=8ef6c7b531e983fa99d8260956a39fd716aee7b45d99461d5170482411ee10c8';

// Códigos de Infracciones de Tránsito (Mantenidos)
const articulosTransito = {
    'Art 1': { delito: 'Transitar por el carril izquierdo en baja velocidad', multa: 0.85 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 2': { delito: 'No portar documentos exigidos', multa: 0.65 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 3': { delito: 'Estacionar en sitios prohibidos', multa: 2.5 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 4': { delito: 'Conducir sin luces en la noche', multa: 1.8 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 5': { delito: 'No respetar señales de tránsito', multa: 2.1 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 6': { delito: 'Transitar en zonas prohibidas', multa: 3.0 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 7': { delito: 'Bloquear intersecciones o pasos peatonales', multa: 1.4 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 8': { delito: 'Transportar personas en platones', multa: 2.65 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 9': { delito: 'Conducir motocicleta sin casco', multa: 2.3 * CONVERSION_MULTA, inmovilizacion: false },

    'Art 10': { delito: 'Conducir sin licencia de conducción', multa: 2.8 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 11': { delito: 'Prestar servicio público sin autorización', multa: 2.35 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 12': { delito: 'No detenerse ante una señal de “PARE” o semáforo en rojo', multa: 1.6 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 13': { delito: 'Adelantar en curva, túnel, puente o sitios prohibidos', multa: 2.4 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 14': { delito: 'Conducir un vehículo con exceso de velocidad', multa: 2.0 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 15': { delito: 'Transitar en sentido contrario', multa: 3.1 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 16': { delito: 'Conducir en estado de embriaguez', multa: 3.3 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 17': { delito: 'Conducir bajo efectos de drogas o sustancias prohibidas', multa: 2.95 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 18': { delito: 'No respetar la prelación en rotondas', multa: 2.15 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 19': { delito: 'No reducir la velocidad en zonas escolares', multa: 1.8 * CONVERSION_MULTA, inmovilizacion: true },

    'Art 20': { delito: 'Participar en piques ilegales', multa: 3.5 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 21': { delito: 'Conducir con exceso de velocidad', multa: 3.1 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 22': { delito: 'Negarse a realizar la prueba de alcoholemia', multa: 2.8 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 23': { delito: 'Conducir un vehículo adulterado', multa: 3.65 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 24': { delito: 'Transportar mercancías peligrosas sin seguridad', multa: 2.7 * CONVERSION_MULTA, inmovilizacion: false },

    'Art 25': { delito: 'Recoger o dejar pasajeros en sitios no autorizados', multa: 1.6 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 26': { delito: 'No cumplir con las rutas asignadas', multa: 2.5 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 27': { delito: 'Conducir servicio público sin uniforme', multa: 1.95 * CONVERSION_MULTA, inmovilizacion: false },
    'Art 28': { delito: 'No respetar las tarifas autorizadas', multa: 2.3 * CONVERSION_MULTA, inmovilizacion: true },
    'Art 29': { delito: 'No permitir el ascenso o descenso seguro de pasajeros', multa: 3.2 * CONVERSION_MULTA, inmovilizacion: true },
};

// --- Configuración (IDs) ---
const CANAL_PERMITIDO = '1409728378767937536';
const CANAL_REGISTRO_MULTAS = '1409091005835251803';
const ROL_MULTA_PENDIENTE = '1409090705900441712';
const ROLES_PERMITIDOS = ['1410027479577661631', '1432095743887413258'];


// --------------------------------------------------------------------------------
// FUNCIONES DE CREACIÓN DE CONTAINERS V2 (Mantenidas)
// --------------------------------------------------------------------------------

const crearContainerError = (mensaje) => {
    return new ContainerBuilder()
        .setAccentColor(16711680) // Rojo
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR_SIMPLE} Error en la Multa`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${mensaje}`)
        );
};


const crearContainerLogPublico = (cedulaInfo, oficialId, targetId, infracciones, multaTotal, fotoUrl, requiereInmovilizacion) => {
    
    const inmovilizacionLabel = requiereInmovilizacion ? 'REQUERIDA' : 'NO REQUERIDA';
    const inmovilizacionStyle = requiereInmovilizacion ? ButtonStyle.Danger : ButtonStyle.Secondary;
    
    // 🟢 Componente de Inmovilización (ButtonAccessory)
    const inmovilizacionSection = new SectionBuilder()
        .setButtonAccessory(
            new ButtonBuilder()
                .setStyle(inmovilizacionStyle)
                .setLabel(inmovilizacionLabel)
                .setDisabled(true) 
                .setCustomId('inmovilizacion_status')
                .setEmoji({ name: inmovilizacionLabel === 'REQUERIDA' ? '🚨' : '✅' }) 
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_WEEWOO_RED} Inmovilización:`),
        );

    const container = new ContainerBuilder()
        .setAccentColor(16776960) 
        
        // --- 1. CABECERA (Thumbnail + Título) ---
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(DITRA_THUMBNAIL_URL)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_ALERTA_ANIMADO} DITRA | SISTEMA DE TRANSITO VEHICULAR.\n\n`),
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // --- 2. ESTADO Y FECHA ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `\n\n## > Estado: Registrada en la base de datos. ${EMOJI_CHECK_ANIMADO}\n## > Fecha: <t:${Math.floor(Date.now() / 1000)}:F>`
            ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // --- 3. INFORMACIÓN CIUDADANO/OFICIAL ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_USER} | Ciudadano Multado:\n` +
                `###\n> ${EMOJI_PUNTO} Nombre: **${cedulaInfo.nombres} ${cedulaInfo.apellidos}**\n` +
                `###\n> ${EMOJI_PUNTO} Usuario: <@${targetId}>\n\n` +
                `### ${EMOJI_POLICE}| Oficial Responsable:\n` +
                `###\n> ${EMOJI_PUNTO} Usuario: <@${oficialId}>\n`
            ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // --- 4. MULTA APLICADA ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `# ${EMOJI_PAPEL} | Multa aplicada.\n` +
                `### > ${EMOJI_PAPEL_LAPIS} Infracciones:\n` +
                `\`\`\`prolog\n${infracciones.map(d => d.codigo).join(', ')}\n\`\`\`\n` +
                `### > ${EMOJI_PAPEL_LAPIS} Monto Total.\n` +
                `\`\`\`\n$${multaTotal.toLocaleString()}\n\`\`\``
            ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // --- 5. INMOVILIZACIÓN (Section con ButtonAccessory) ---
        .addSectionComponents(inmovilizacionSection)
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // --- 6. FOTO INFRACCIÓN ---
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder().setURL(fotoUrl),
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // --- 7. FOOTER ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## *Registro Oficial de la Policía de Tránsito de Bogotá* ${EMOJI_DITRA_LOGO}`),
        );
        
    return container;
};

const crearContainerDMInfractor = (cedulaInfo, oficialId, infracciones, multaTotal, requiereInmovilizacion) => {
    
    const detallesInfraccionesConMulta = infracciones.map(i => 
        `[${i.codigo}] ${i.delito} ($${i.multa.toLocaleString()})`
    ).join('\n');
    
    const inmovilizacionTag = requiereInmovilizacion ? '⚠️ **REQUERIDA**' : '✅ **NO REQUERIDA**';

    const container = new ContainerBuilder()
        .setAccentColor(16776960) 
        
        // --- TÍTULO Y CABECERA ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_ALERTA_ANIMADO} NOTIFICACIÓN DE COMPARENDO DITRA`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`Se le ha impuesto un comparendo por infracciones de tránsito en Bogotá RP.`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        
        // --- DATOS BÁSICOS ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_POLICE} OFICIAL Y CIUDADANO\n` +
                `> **Oficial:** <@${oficialId}>\n` +
                `> **Ciudadano:** \`${cedulaInfo.nombres} ${cedulaInfo.apellidos}\``
            )
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        
        // --- MULTA Y MOVILIZACIÓN ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_PAPEL} RESUMEN DE SANCIÓN\n` +
                `> **Monto Total a Pagar:** \`$${multaTotal.toLocaleString()}\`\n` +
                `> **Inmovilización del Vehículo:** ${inmovilizacionTag}\n`
            )
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )

        // --- DETALLE DE INFRACCIONES (Mejorado) ---
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ${EMOJI_PAPEL_LAPIS} INFRACCIONES DETALLADAS\n` +
                `\`\`\`markdown\n# CODIGO - DELITO (VALOR)\n${detallesInfraccionesConMulta}\n\`\`\``
            )
        )
        .addTextDisplayComponents(
             new TextDisplayBuilder().setContent(`*Por favor, contacte al oficial o un superior para el procedimiento de pago. Recibió el rol de multa pendiente.*`)
        );
        
    return container;
};

const crearContainerDMOficial = (cedulaInfo, targetId, beneficio) => {
    return new ContainerBuilder()
        .setAccentColor(65280) 
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## 💰 NOTIFICACIÓN DE MULTA EXITOSA')
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`¡Felicidades, oficial! Su multa ha sido procesada correctamente.`)
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true)
        )
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**👤 Ciudadano multado:** > ${cedulaInfo.nombres} ${cedulaInfo.apellidos} (<@${targetId}>)`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`**💵 Beneficio obtenido:** > \`$${beneficio.toLocaleString()}\``)
        )
        
        .addTextDisplayComponents(
             new TextDisplayBuilder().setContent(`*Estos fondos ya han sido añadidos a tu balance.*`)
        );
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('multa')
        .setDescription('Aplica una multa de tránsito a un ciudadano.')
        
        // --- OPCIONES REQUERIDAS (ORDEN DE ARRESTO) ---
        
        .addUserOption(option =>
            option.setName('usuario')
            .setDescription('El ciudadano a multar.')
            .setRequired(true))

        // NUEVA OPCIÓN: Argumento de texto para las infracciones
        .addStringOption(option =>
            option.setName('infracciones')
            .setDescription('Códigos de infracción separados por coma (Ej: Art 3, Art 15, Art 20).')
            .setRequired(true))

        .addAttachmentOption(option =>
            option.setName('foto_infraccion')
            .setDescription('Sube una foto de la infracción.')
            .setRequired(true)),
    
    async execute(interaction) {
        
        // Deferir y usar editReply()
        await interaction.deferReply({ ephemeral: true });

        // --- 0. Verificaciones de Canales y Roles (V1, usando content) ---
        if (interaction.channelId !== CANAL_PERMITIDO) {
            return interaction.editReply({ content: `${EMOJI_ERROR_SIMPLE} Este comando solo puede usarse en <#${CANAL_PERMITIDO}>.` });
        }
        
        if (!interaction.member.roles.cache.some(role => ROLES_PERMITIDOS.includes(role.id))) {
            return interaction.editReply({ content: `⛔ No tienes permiso para usar este comando.` });
        }

        const targetUser = interaction.options.getUser('usuario');
        const fotoInfraccion = interaction.options.getAttachment('foto_infraccion');
        const infraccionesInput = interaction.options.getString('infracciones'); // <-- OBTENEMOS EL STRING DE INFRACCIONES
        
        // --- PROCESAR CÓDIGOS DE INFRACCIÓN ---
        const codigosSeleccionados = infraccionesInput
            .split(',')
            .map(code => code.trim().replace(/ART|Art\s|Art\./g, 'Art ')) // Normaliza a "Art X"
            .filter(code => code.length > 0);
            
        if (codigosSeleccionados.length === 0) {
             const errorContainer = crearContainerError('No se pudo identificar ninguna infracción válida. Asegúrate de separarlas por comas (Ej: Art 3, Art 15).');
             return interaction.editReply({ 
                components: [errorContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        let totalMulta = 0;
        let requiereInmovilizacion = false;
        const infraccionesProcesadas = [];
        const codigosInvalidos = [];
        
        for (const codigo of codigosSeleccionados) {
            const articulo = articulosTransito[codigo];

            if (articulo) {
                totalMulta += articulo.multa;
                if (articulo.inmovilizacion) {
                    requiereInmovilizacion = true;
                }
                infraccionesProcesadas.push({ ...articulo, codigo });
            } else {
                codigosInvalidos.push(codigo);
            }
        }
        
        if (infraccionesProcesadas.length === 0) {
            const errorContainer = crearContainerError(`Las infracciones proporcionadas son inválidas. Códigos intentados: \`${codigosSeleccionados.join(', ')}\``);
            return interaction.editReply({ 
                components: [errorContainer], 
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        // Advertencia si hay códigos inválidos (Usamos followUp)
        if (codigosInvalidos.length > 0) {
            await interaction.followUp({
                content: `${EMOJI_ERROR_SIMPLE} **Advertencia:** Las siguientes infracciones no fueron reconocidas y fueron omitidas: \`${codigosInvalidos.join(', ')}\`.`,
                ephemeral: true
            });
        }

        // --- 1. Mensaje de Carga (V2) ---
        const loadingContainer = new ContainerBuilder()
            .setAccentColor(28672) 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`## ${EMOJI_POLICE} Procesando Multa...`)
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('```css\n[+] Verificando datos en el RUNT...\n[+] Generando comparendo electrónico...\n[+] Conexión con el sistema de multas establecida...```')
            );

        await interaction.editReply({ 
            components: [loadingContainer],
            flags: MessageFlags.IsComponentsV2,
            content: '' 
        });
        
        // --- 2. Obtención de datos de la BD ---
        const [cedulaInfo, oficialEconomia] = await Promise.all([
            Cedula.findOne({ where: { discordId: targetUser.id } }),
            Economia.findOne({ where: { discordId: interaction.user.id } })
        ]);

        // --- 3. Validaciones de la base de datos (Usando V2 Error Container) ---
        if (!cedulaInfo) {
            const errorContainer = crearContainerError(`El usuario **${targetUser.tag}** no tiene una cédula registrada. No se puede procesar la multa.`);
            return interaction.editReply({ components: [errorContainer], content: '', flags: MessageFlags.IsComponentsV2 });
        }
        
        if (!oficialEconomia) {
            const errorContainer = crearContainerError(`El oficial **${interaction.user.tag}** no tiene registro de economía. Proceso cancelado.`);
            return interaction.editReply({ components: [errorContainer], content: '', flags: MessageFlags.IsComponentsV2 });
        }

        // --- PROCESO PRINCIPAL DE MULTA y CÁLCULO (LÓGICA CRÍTICA) ---
        try {
            // --- Aplicar Rol de Multa Pendiente ---
            interaction.guild.members.fetch(targetUser.id)
                .then(member => member.roles.add(ROL_MULTA_PENDIENTE).catch(roleError => {
                    console.error(`[Error] No se pudo asignar el rol de multa pendiente a ${member.user.tag}.`, roleError);
                }))
                .catch(err => console.error(`[Error] No se pudo obtener el miembro para rol:`, err));

            // --- Calcular y aplicar beneficio al oficial ---
            const beneficioOficial = Math.round(totalMulta * 0.10);
            if (beneficioOficial > 0) {
                oficialEconomia.cartera += beneficioOficial;
                await oficialEconomia.save(); 
            }
            
            // 🚀 RESPUESTA FINAL RÁPIDA DE ÉXITO 
            const finalSuccessContainer = new ContainerBuilder()
                .setAccentColor(65280) // Verde
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`✅ La multa de \`${infraccionesProcesadas.length}\` infracción(es) para <@${targetUser.id}> ha sido procesada y registrada con éxito.`)
                );

            // IMPORTANTE: Como ya no hay collector, usamos editReply final.
            await interaction.editReply({ 
                components: [finalSuccessContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
            
            // --- LÓGICA LENTA (Logs y DMs) EN SEGUNDO PLANO (Logs y DMs) ---
            
            // 1. Log Público (Canal de registro) - V2 (Con nuevo diseño DITRA)
            const logContainer = crearContainerLogPublico(
                cedulaInfo, interaction.user.id, targetUser.id, infraccionesProcesadas, totalMulta, fotoInfraccion.url, requiereInmovilizacion
            );

            const canalLogs = await interaction.guild.channels.fetch(CANAL_REGISTRO_MULTAS);
            if (canalLogs) {
                canalLogs.send({ 
                    components: [logContainer],
                    flags: MessageFlags.IsComponentsV2,
                    content: ''
                }).catch(console.error);
            }

            // 2. DM al infractor - V2 (Con detalle de multa mejorado)
            const dmInfractorContainer = crearContainerDMInfractor(
                cedulaInfo, interaction.user.id, infraccionesProcesadas, totalMulta, requiereInmovilizacion
            );

            targetUser.send({ 
                components: [dmInfractorContainer],
                flags: MessageFlags.IsComponentsV2,
                content: ''
            }).catch(err => {
                console.error(`No se pudo enviar un DM al infractor ${targetUser.tag}:`, err);
            });

            // 3. DM al oficial - V2
            const dmOficialContainer = crearContainerDMOficial(
                cedulaInfo, targetUser.id, beneficioOficial
            );

            interaction.user.send({ 
                components: [dmOficialContainer],
                flags: MessageFlags.IsComponentsV2,
                content: ''
            }).catch(err => {
                console.error(`No se pudo enviar un DM al oficial ${interaction.user.tag}:`, err);
            });
            
        } catch (error) {
            console.error('[Error en Comando Multa (Final)]:', error);
            const errorContainer = crearContainerError('Ocurrió un error inesperado al procesar las transacciones. Por favor, contacta a un desarrollador.');
            return interaction.editReply({ 
                components: [errorContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
    }
};