const {
    SlashCommandBuilder,
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SectionBuilder, 
    ThumbnailBuilder, 
    // Componentes V1/V2 compatibles
    ActionRowBuilder, 
    MessageFlags,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
const Cedula = require('../models/Cedula');
const Economia = require('../models/Economia');

// --- CONSTANTES GLOBALES Y EMOJIS ---
const CONVERSION_PRISION = 300; 
const CONVERSION_MULTA = 1000000; 
const BENEFICIO_OFICIAL_PERCENTAJE = 0.10; 
const MAX_ARTICULOS_LOG = 3; 

// URL DE IMAGEN SOLICITADA
const URL_ESCUDO_INPEC = 'https://cdn.discordapp.com/attachments/1437915183979823337/1445213629002813520/Escudo_INPEC.png?ex=692f8793&is=692e3613&hm=cbf517b320cf927829de638e2527cf6ab3ff8e19a55b968da5c7eeda47f12d4e';

// Emojis personalizados 
const EMOJI_CHECK = '<a:71227checkyes:1442172457862561923>'; 
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const EMOJI_WARNING = '<a:85951rfalert:1445814281160491030>';

// Emojis específicos del Log de Arresto
const EMOTE_INPEC_ESCUDO = '<:EscudoINPEC:1445201411272085696>';
const EMOTE_USER = '<:76049user11:1442175091050942634>';
const EMOTE_POLICE = '<a:41330policeofficer:1445206207509041345>';
const EMOTE_HANDCUFFS = '<:8831handcuffs:1445207161448829080>';
const EMOTE_CALENDAR = '<:106109protoncalendar:1445204334575882291>';

const ACCENT_COLOR_LOG_PUBLICO = 16711697; // Rojo INPEC
const ACCENT_COLOR_DM_INFRACTOR = 16711680; // Rojo
const ACCENT_COLOR_DM_OFICIAL = 65280; // Verde

// Códigos Penales de México Nuevo Laredo [ER:LC] (COMPLETO)
const articulosPenales = {
    'AC-01': { delito: 'Homicidio simple', prision: 10 * CONVERSION_PRISION, multa: 7 * CONVERSION_MULTA, antecedente: true },
    'AC-02': { delito: 'Homicidio culposo', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-03': { delito: 'Lesiones personales graves', prision: 6 * CONVERSION_PRISION, multa: 3.5 * CONVERSION_MULTA, antecedente: true },
    'AC-04': { delito: 'Lesiones leves', prision: 2 * CONVERSION_PRISION, multa: 1.5 * CONVERSION_MULTA, antecedente: false },
    'AC-05': { delito: 'Amenazas de muerte', prision: 1.5 * CONVERSION_PRISION, multa: 1 * CONVERSION_MULTA, antecedente: true },
    'AC-2.1': { delito: 'Intento de Homicidio', prision: 8 * CONVERSION_PRISION, multa: 5 * CONVERSION_MULTA, antecedente: true },
    'AC-06': { delito: 'Hurto simple', prision: 3 * CONVERSION_PRISION, multa: 2 * CONVERSION_MULTA, antecedente: true },
    'AC-07': { delito: 'Hurto calificado', prision: 6.5 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-08': { delito: 'Estafa', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-09': { delito: 'Daño en bien ajeno', prision: 2 * CONVERSION_PRISION, multa: 1.5 * CONVERSION_MULTA, antecedente: true },
    'AC-10': { delito: 'Extorsión', prision: 8 * CONVERSION_PRISION, multa: 6.5 * CONVERSION_MULTA, antecedente: true },
    'AC-11': { delito: 'Secuestro simple', prision: 10 * CONVERSION_PRISION, multa: 7 * CONVERSION_MULTA, antecedente: true },
    'AC-12': { delito: 'Privación ilegal de la libertad', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-13': { delito: 'Amenaza', prision: 1.5 * CONVERSION_PRISION, multa: 1 * CONVERSION_MULTA, antecedente: false },
    'AC-14': { delito: 'Chantaje', prision: 3.5 * CONVERSION_PRISION, multa: 2.5 * CONVERSION_MULTA, antecedente: true },
    'AC-15': { delito: 'Acoso', prision: 1.5 * CONVERSION_PRISION, multa: 1 * CONVERSION_MULTA, antecedente: true },
    'AC-16': { delito: 'Porte ilegal de armas', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-17': { delito: 'Fabricación o tráfico de armas', prision: 8 * CONVERSION_PRISION, multa: 6.5 * CONVERSION_MULTA, antecedente: true },
    'AC-18': { delito: 'Explosivos no autorizados', prision: 6.5 * CONVERSION_PRISION, multa: 5.5 * CONVERSION_MULTA, antecedente: true },
    'AC-19': { delito: 'Concierto para delinquir', prision: 8 * CONVERSION_PRISION, multa: 6.5 * CONVERSION_MULTA, antecedente: true },
    'AC-20': { delito: 'Perturbación del orden público', prision: 3.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-21': { delito: 'Cohecho (soborno)', prision: 4.5 * CONVERSION_PRISION, multa: 3.5 * CONVERSION_MULTA, antecedente: true },
    'AC-22': { delito: 'Peculado (robo de recursos públicos)', prision: 6.5 * CONVERSION_PRISION, multa: 5.5 * CONVERSION_MULTA, antecedente: true },
    'AC-23': { delito: 'Abuso de autoridad', prision: 3.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-24': { delito: 'Prevaricato', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-25': { delito: 'Falsedad en documento público', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-26': { delito: 'Conducción en estado de embriaguez', prision: 2 * CONVERSION_PRISION, multa: 2 * CONVERSION_MULTA, antecedente: true },
    'AC-27': { delito: 'Transporte de Contrabando', prision: 8 * CONVERSION_PRISION, multa: 10 * CONVERSION_MULTA, antecedente: true },
    'AC-28': { delito: 'Conducción temeraria', prision: 2 * CONVERSION_PRISION, multa: 1.5 * CONVERSION_MULTA, antecedente: true },
    'AC-29': { delito: 'Fuga en accidente de tránsito', prision: 3 * CONVERSION_PRISION, multa: 2.5 * CONVERSION_MULTA, antecedente: true },
    'AC-29.1': { delito: 'Fuga de la justicia', prision: 6 * CONVERSION_PRISION, multa: 6 * CONVERSION_MULTA, antecedente: true },
    'AC-30': { delito: 'Transporte ilegal de armas o drogas', prision: 8 * CONVERSION_PRISION, multa: 6.5 * CONVERSION_MULTA, antecedente: true },
    'AC-32.1': { delito: 'Porte de prendas militares', prision: 6 * CONVERSION_PRISION, multa: 5 * CONVERSION_MULTA, antecedente: true },
    'AC-31': { delito: 'Tráfico de estupefacientes', prision: 10 * CONVERSION_PRISION, multa: 7 * CONVERSION_MULTA, antecedente: true },
    'AC-32': { delito: 'Porte de estupefacientes', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-33': { delito: 'Cultivo ilícito', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-34': { delito: 'Distribución de drogas', prision: 7.5 * CONVERSION_PRISION, multa: 5.5 * CONVERSION_MULTA, antecedente: true },
    'AC-35': { delito: 'Consumo en vía pública', prision: 1.5 * CONVERSION_PRISION, multa: 1 * CONVERSION_MULTA, antecedente: false },
    'AC-36': { delito: 'Acceso no autorizado a sistemas', prision: 3.5 * CONVERSION_PRISION, multa: 2.5 * CONVERSION_MULTA, antecedente: true },
    'AC-37': { delito: 'Hurto de datos personales', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-38': { delito: 'Estafa electrónica', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true },
    'AC-39': { delito: 'Daño informático', prision: 3.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-40': { delito: 'Suplantación de identidad', prision: 2 * CONVERSION_PRISION, multa: 1.5 * CONVERSION_MULTA, antecedente: true },
    'AC-41': { delito: 'Desacato a la autoridad', prision: 1.5 * CONVERSION_PRISION, multa: 1 * CONVERSION_MULTA, antecedente: false },
    'AC-42': { delito: 'Fuga de presos', prision: 5 * CONVERSION_PRISION, multa: 4 * CONVERSION_MULTA, antecedente: true },
    'AC-43': { delito: 'Obstrucción a la justicia', prision: 4.5 * CONVERSION_PRISION, multa: 3 * CONVERSION_MULTA, antecedente: true },
    'AC-44': { delito: 'Soborno a testigos', prision: 3.5 * CONVERSION_PRISION, multa: 2.5 * CONVERSION_MULTA, antecedente: true },
    'AC-45': { delito: 'Asociación ilícita', prision: 6 * CONVERSION_PRISION, multa: 4.5 * CONVERSION_MULTA, antecedente: true }
};

const CANAL_PERMITIDO = '1409728378767937536';
const CANAL_REGISTRO = '1409091001452200049';
const ROL_ANTECEDENTES = '1409090704046686289';
const ROLES_PERMITIDOS = ['1409090683427487855', '1409090684190982217', '1409090681414094879','1410027479577661631' ];


// --------------------------------------------------------------------------------
// FUNCIÓN DE CREACIÓN DE CONTAINER ERROR
// --------------------------------------------------------------------------------
const crearContainerError = (mensaje) => {
    return new ContainerBuilder()
        .setAccentColor(16711680) // Rojo
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Error en el Arresto`)
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`> ${mensaje}`)
        );
};


// --------------------------------------------------------------------------------
// FUNCIÓN DE CREACIÓN DE CONTAINER LOG PÚBLICO (COMPACTA Y CORREGIDA V2)
// --------------------------------------------------------------------------------

const crearContainerLogPublico = (cedulaInfo, oficialId, targetId, articulos, prisionTotal, multaTotal, fotoUrl, tieneAntecedente) => {
    
    const prisionYears = (prisionTotal / CONVERSION_PRISION).toFixed(1);
    const multaFormatted = `$${multaTotal.toLocaleString()}`;
    const cargosListCompacta = articulos.slice(0, MAX_ARTICULOS_LOG).map(a => `\`${a.codigo}\``).join(' ');
    const cargosExtra = articulos.length > MAX_ARTICULOS_LOG ? ` (+${articulos.length - MAX_ARTICULOS_LOG} más)` : '';

    
    // Configuración del botón de Antecedentes
    const antecedenteButton = new ButtonBuilder()
        .setCustomId(`antecedentes_check_${targetId}`) 
        .setLabel(tieneAntecedente ? "Posee Antecedentes" : "Sin Antecedentes")
        .setStyle(tieneAntecedente ? ButtonStyle.Danger : ButtonStyle.Success) 
        .setEmoji(EMOTE_INPEC_ESCUDO)
        .setDisabled(true); 

    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_LOG_PUBLICO); 

    // 1. Título y Thumbnail 
    container.addSectionComponents(
        new SectionBuilder()
            .setThumbnailAccessory(
                new ThumbnailBuilder().setURL(URL_ESCUDO_INPEC) 
            )
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`# ${EMOTE_INPEC_ESCUDO} REGISTRO DE ARRESTO CARCELARIO`)
            )
    );

    container.addSeparatorComponents(new SeparatorBuilder());
    
    // 2. Info Ciudadano, Oficial y Fecha (Compactado en un solo TextDisplay)
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `### ${EMOTE_USER} Ciudadano: **${cedulaInfo.nombres} ${cedulaInfo.apellidos}** (<@${targetId}>)\n` +
            `### ${EMOTE_POLICE} Oficial: <@${oficialId}>\n` +
            `### ${EMOTE_CALENDAR} Fecha: <t:${Math.floor(Date.now() / 1000)}:f>` // Cambié 'F' a 'f' para una fecha/hora más corta
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder());
    
    // 3. Sentencia Aplicada (Compactado)
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `## ${EMOTE_HANDCUFFS} Sentencia Aplicada:\n` +
            `### > **Tiempo:** \`${prisionYears} años\`\n` +
            `### > **Multa:** \`${multaFormatted}\`\n\n` +
            `### > **Cargos (${articulos.length}):** ${cargosListCompacta}${cargosExtra}`
        )
    );

    container.addSeparatorComponents(new SeparatorBuilder());
    
    // 4. Botón de Antecedentes y Media Gallery (Juntos)
    container.addSectionComponents(
        new SectionBuilder()
            .setButtonAccessory(antecedenteButton)
            .addTextDisplayComponents( 
                new TextDisplayBuilder().setContent("Verificación de antecedentes del ciudadano:") 
            )
    );

    container.addMediaGalleryComponents(
        new MediaGalleryBuilder()
            .addItems(
                new MediaGalleryItemBuilder().setURL(fotoUrl) 
            )
    );
    
    container.addSeparatorComponents(new SeparatorBuilder());
    
    // 5. Pie de página
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`${EMOJI_CHECK} *Registro procesado por el Sistema Penitenciario.*`)
    );
        
    return container;
};


// --------------------------------------------------------------------------------
// FUNCIONES DE DM 
// --------------------------------------------------------------------------------

const crearContainerDMInfractor = (cedulaInfo, oficialId, articulos, prisionTotal, multaTotal, saldoFinal, tieneAntecedente) => {
    
    // Detalle de delitos
    const detallesDelitos = articulos.map(articulo => {
        const prisionYears = (articulo.prision / CONVERSION_PRISION).toFixed(1);
        const multaMillions = (articulo.multa / CONVERSION_MULTA).toFixed(1);
        return `\`${articulo.codigo}\` ${articulo.delito} | ${prisionYears} años / $${multaMillions}M`;
    }).join('\n');
    
    const antecedentesEstado = tieneAntecedente ? '`[ REGISTRADO ]`' : '`[ NO REGISTRADO ]`';
    
    const container = new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_DM_INFRACTOR) 
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${EMOTE_INPEC_ESCUDO} NOTIFICACIÓN DE SENTENCIA`)
        )
        .addSeparatorComponents(new SeparatorBuilder())
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### **${EMOTE_POLICE} Oficial:** <@${oficialId}>\n` +
                `### **${EMOTE_USER} Ciudadano:** ${cedulaInfo.nombres} ${cedulaInfo.apellidos}`
            )
        )
        
        .addSeparatorComponents(new SeparatorBuilder())
        
        // Sentencia y Economía
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### **⚖️ SENTENCIA**\n` +
                `> Prisión Total: \`${(prisionTotal / CONVERSION_PRISION).toFixed(1)} años\`\n` +
                `> Multa Aplicada: \`$${multaTotal.toLocaleString()}\`\n` +
                `> Saldo Cartera Final: \`$${saldoFinal.toLocaleString()}\`\n\n` +
                `> **Antecedentes:** ${antecedentesEstado}`
            )
        )
        
        .addSeparatorComponents(new SeparatorBuilder())
        
        // Cargos
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### **📖 Cargos Detallados:**\n\`\`\`\n${detallesDelitos}\n\`\`\``)
        )
        .addTextDisplayComponents(
             new TextDisplayBuilder().setContent(`*Recuerde cumplir su sentencia.*`)
        );
        
    return container;
};

const crearContainerDMOficial = (cedulaInfo, targetId, beneficio) => {
    return new ContainerBuilder()
        .setAccentColor(ACCENT_COLOR_DM_OFICIAL) 
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('## ✅ ARRESTO PROCESADO CORRECTAMENTE')
        )
        .addSeparatorComponents(new SeparatorBuilder())
        
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### **${EMOTE_USER} Ciudadano arrestado:** > ${cedulaInfo.nombres} ${cedulaInfo.apellidos} (<@${targetId}>)`
            )
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### **💰 Beneficio obtenido:** > \`$${beneficio.toLocaleString()}\``
            )
        )
        
        .addTextDisplayComponents(
             new TextDisplayBuilder().setContent(`*Los fondos ya fueron depositados en tu cartera.*`)
        );
};


module.exports = {
    data: new SlashCommandBuilder()
        .setName('arresto')
        .setDescription('Aplica una sanción penal a un ciudadano.')
        
        // --- 1. OPCIONES REQUERIDAS (ORDEN CORRECTO) ---
        
        .addUserOption(option =>
            option.setName('usuario')
            .setDescription('El ciudadano a ser arrestado.')
            .setRequired(true))
            
        .addStringOption(option =>
            option.setName('articulos')
            .setDescription('Códigos penales separados por coma (Ej: AC-01, AC-07, AC-29.1).')
            .setRequired(true))
            
        .addAttachmentOption(option =>
            option.setName('evidencia') 
            .setDescription('Sube una foto/evidencia del arresto.')
            .setRequired(true)) 
            
        // --- 2. OPCIONES NO REQUERIDAS (DEBEN IR AL FINAL) ---
        
        .addIntegerOption(option =>
            option.setName('tiempo_extra_minutos')
            .setDescription('Tiempo de prisión extra en minutos (Opcional).')
            .setRequired(false)), 

    async execute(interaction) {
        
        // Deferir y usar editReply() según instrucción
        await interaction.deferReply({ ephemeral: true });
        
        // 1. Validaciones de canal y permisos
        if (interaction.channelId !== CANAL_PERMITIDO) {
            return interaction.editReply({ 
                components: [crearContainerError(`Este comando solo puede usarse en <#${CANAL_PERMITIDO}>.`)],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        if (!interaction.member.roles.cache.some(role => ROLES_PERMITIDOS.includes(role.id))) {
             return interaction.editReply({ 
                components: [crearContainerError(`No tienes permiso para usar este comando.`)],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }

        const targetUser = interaction.options.getUser('usuario');
        const articulosInput = interaction.options.getString('articulos');
        const tiempoExtra = interaction.options.getInteger('tiempo_extra_minutos') || 0;
        const fotoArresto = interaction.options.getAttachment('evidencia');
        
        
        // 2. Procesar Artículos Penales
        const codigosSeleccionados = articulosInput
            .toUpperCase()
            .split(',')
            .map(code => code.trim().replace(/ART:|AC-/g, '').trim()) 
            .filter(code => code.length > 0);
        
        if (codigosSeleccionados.length === 0) {
             return interaction.editReply({ 
                components: [crearContainerError('No se pudo identificar ningún código penal válido. Asegúrate de separarlos por comas (Ej: AC-01, AC-07).')],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }

        let totalPrision = tiempoExtra * CONVERSION_PRISION; 
        let totalMulta = 0; 
        let tieneAntecedente = false;
        const articulosProcesados = [];
        const codigosInvalidos = [];
        
        for (const codigoLimpio of codigosSeleccionados) {
            const codigoCompleto = `AC-${codigoLimpio}`; 
            const articulo = articulosPenales[codigoCompleto];

            if (articulo) {
                totalPrision += articulo.prision;
                totalMulta += articulo.multa;
                if (articulo.antecedente) {
                    tieneAntecedente = true;
                }
                articulosProcesados.push({ ...articulo, codigo: codigoCompleto });
            } else {
                codigosInvalidos.push(codigoLimpio);
            }
        }
        
        if (articulosProcesados.length === 0) {
            return interaction.editReply({ 
                components: [crearContainerError(`Los códigos penales proporcionados son inválidos. Códigos intentados: \`${codigosSeleccionados.join(', ')}\``)],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        // Si hay códigos inválidos, avisamos pero continuamos (Usamos followUp)
        if (codigosInvalidos.length > 0) {
            await interaction.followUp({
                content: `${EMOJI_WARNING} **Advertencia:** Los siguientes códigos penales no fueron reconocidos y fueron omitidos: \`${codigosInvalidos.join(', ')}\`.`,
                ephemeral: true
            });
        }

        // 3. Mensaje de Carga y Obtención de Datos de BD
        const loadingContainer = crearContainerError('Conectando con el Sistema del INPEC...');
        loadingContainer.setAccentColor(28672) 
            .addTextDisplayComponents(
                new TextDisplayBuilder().setContent('```css\n[+] Procesando sentencia y consultando bases de datos...\n```')
            );
        
        await interaction.editReply({ 
            components: [loadingContainer], 
            flags: MessageFlags.IsComponentsV2, 
            content: '' 
        });

        const [cedulaInfo, infractorEconomia] = await Promise.all([
            Cedula.findOne({ where: { discordId: targetUser.id } }),
            Economia.findOne({ where: { discordId: targetUser.id } })
        ]);

        const oficialEconomia = await Economia.findOne({ where: { discordId: interaction.user.id } });

        // 4. Validaciones de la base de datos
        if (!cedulaInfo) {
            const errorContainer = crearContainerError(`El usuario **${targetUser.tag}** no tiene una cédula registrada. No se puede procesar el arresto.`);
            return interaction.editReply({ 
                components: [errorContainer], 
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            }); 
        }
        
        if (!infractorEconomia || !oficialEconomia) {
            const errorMsg = !infractorEconomia 
                ? `El infractor **${targetUser.tag}** no tiene registro de economía. Proceso cancelado.`
                : `El oficial **${interaction.user.tag}** no tiene registro de economía. Proceso cancelado.`;
            
            const errorContainer = crearContainerError(errorMsg);
            return interaction.editReply({ 
                components: [errorContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
        
        // --- 5. LÓGICA DE ECONOMÍA CRÍTICA y Roles ---
        
        let beneficioOficial = 0;
        
        try {
            if (totalMulta > 0) {
                infractorEconomia.cartera -= totalMulta;
                if (infractorEconomia.cartera < 0) { infractorEconomia.cartera = 0; }
                await infractorEconomia.save();
            }

            beneficioOficial = Math.round(totalMulta * BENEFICIO_OFICIAL_PERCENTAJE);
            if (beneficioOficial > 0) {
                oficialEconomia.cartera += beneficioOficial;
                await oficialEconomia.save();
            }

            if (tieneAntecedente) {
                interaction.guild.members.fetch(targetUser.id)
                    .then(member => member.roles.add(ROL_ANTECEDENTES).catch(roleError => {
                        console.error(`[Error] No se pudo asignar el rol de antecedentes a ${member.user.tag}.`, roleError);
                    }))
                    .catch(err => console.error(`[Error] No se pudo obtener el miembro para rol:`, err));
            }
            
            // 6. RESPUESTA FINAL RÁPIDA DE ÉXITO 
            const finalSuccessContainer = new ContainerBuilder()
                .setAccentColor(3066993) 
                .addTextDisplayComponents(
                    new TextDisplayBuilder()
                        .setContent(`# ${EMOJI_CHECK} ¡Arresto Completado! Sentencia aplicada: \`${(totalPrision / CONVERSION_PRISION).toFixed(1)} años\` y \`$${totalMulta.toLocaleString()}\``)
                );

            await interaction.editReply({ 
                components: [finalSuccessContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });

            // --- 7. LÓGICA LENTA (Logs y DMs) EN SEGUNDO PLANO ---
            
            // Log Público
            const logContainer = crearContainerLogPublico(
                cedulaInfo, interaction.user.id, targetUser.id, articulosProcesados, totalPrision, totalMulta, fotoArresto.url, tieneAntecedente
            );
            
            const canalLogs = await interaction.guild.channels.fetch(CANAL_REGISTRO);
            if (canalLogs) {
                // CORRECCIÓN DE API: Quitamos el 'content' ya que MessageFlags.IsComponentsV2 lo prohíbe
                await canalLogs.send({ 
                    components: [logContainer], 
                    flags: MessageFlags.IsComponentsV2,
                    content: '' // DEBEMOS ASEGURARNOS QUE ESTÉ VACÍO
                }).catch(console.error);
            }
            
            // DM Infractor
            const dmInfractorContainer = crearContainerDMInfractor(
                cedulaInfo, interaction.user.id, articulosProcesados, totalPrision, totalMulta, infractorEconomia.cartera, tieneAntecedente
            );

            targetUser.send({ 
                components: [dmInfractorContainer],
                flags: MessageFlags.IsComponentsV2,
                content: ''
            }).catch(err => {
                console.error(`No se pudo enviar un DM al infractor ${targetUser.tag}:`, err);
            });

            // DM Oficial
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
            console.error('[Error en Comando Arresto (Transacción)]:', error);
            const errorContainer = crearContainerError('Ocurrió un error inesperado al procesar las transacciones. Por favor, contacta a un desarrollador.');
            return interaction.editReply({ 
                components: [errorContainer],
                content: '', 
                flags: MessageFlags.IsComponentsV2 
            });
        }
    }
};