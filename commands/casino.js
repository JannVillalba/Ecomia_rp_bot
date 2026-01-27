// casino.js

const {
    SlashCommandBuilder,
    // Componentes V2
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    ThumbnailBuilder,
    StringSelectMenuBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SelectMenuOptionBuilder,
    MessageFlags,
    ModalBuilder, 
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const Economia = require('../models/Economia');
// Asumiendo que existe un archivo '../utils/helpers.js' con la función sleep
const { sleep } = require('../utils/helpers'); 

// --- EMOJIS PERSONALIZADOS ---
const EMOJI_LOADING = '<a:98557greenloveloading:1445559254617424034>'; // Carga del Casino (Solo para /casino inicial)
const EMOJI_SLOTS_STATIC = '<a:welcomeglitch:1445572629024215152>'; // Título del Casino
const EMOJI_DINERO_ANIM = '<a:72389moneywings:1445094681418399917>'; // Dinero (accesorio del botón)
const EMOJI_STAR_ANIM = '<a:8699rightrainbowstar:1445566320564502548>'; // Pie de página
const EMOJI_ERROR = '<:874346wrong:1445095979253764116>';
const EMOJI_SLOT_ICON = '<:23570lotteryslots:1445560210369544242>'; // Icono de Slot Machine
const EMOJI_DINERO_STATIC = '<:238591money:1445520558254067884>'; // Icono de dinero para apuestas
// --- NUEVOS EMOJIS BASADOS EN EL JSON ---
const EMOJI_NEW_LOADING = '<a:730862lding:1445813880776560661>'; // Nuevo emoji de carga para Slot
const EMOJI_RESULTADO = '<a:9892weewoored:1445807417651757208>'; // Emoji de título de Resultado
const EMOJI_WIN = '<:94492moneyeyes:1447017284857233479>'; // Emoji de ganancia
const EMOJI_CASH_ANIM = '<a:999284cash:1447016427264540873>'; // Emoji de billete animado para accesorios
// --- -----------------------------------

// --- CONFIGURACIÓN ---
const CANAL_PERMITIDO = '1445580895091298346'; 
const SEPARATOR_SPACING_SMALL = 1;
const BOT_AVATAR_URL = "https://cdn.discordapp.com/avatars/1409651745403044011/d5e3a824c8d75b0a4e787fdce0dd587a.png?size=4096"; // Avatar usado en los JSON

// --- GIFS ACTUALIZADOS ---
const GIF_LOADING_SPIN = "https://cdn.discordapp.com/attachments/1068711680718151803/1445561155350167654/standard.gif?ex=6930cb3c&is=692f79bc&hm=18f545971a2e39108b2032e104e698228fb62c29144a3ab41dcb5dc08be4ba04";
// --- NUEVOS GIFS BASADOS EN EL JSON ---
const GIF_SPINNING_SLOT = "https://cdn.discohook.app/tenor/jago33-slot-machine-slot-online-casino-medan-gif-25082594.gif";
const GIF_WINNER = "https://cdn.discohook.app/tenor/money-heist-cash-money-counter-hundred-dollar-bills-gif-22524130.gif";
const GIF_LOOSER = "https://cdn.discohook.app/tenor/ha-ha-nelson-the-simpsons-gif-6975220780730021991.gif";
// -------------------------

// --- SÍMBOLOS Y PAGOS DEL SLOT MACHINE ---
const SLOT_SYMBOLS = ['🍎', '🍒', '🍋', '💰', '💎']; // Índices 0, 1, 2, 3, 4
const PAYOUTS = {
    '🍎': 2,    // Dobla la apuesta (2x)
    '🍒': 2,
    '🍋': 2,
    '💰': 5,    // 5x la apuesta
    '💎': 10,   // 10x la apuesta
};
// ------------------------------------------

// --- CONFIGURACIÓN DE LÍMITES Y CACHÉ ---
const MAX_PLAYS = 8;
const MAX_LOSSES = 5;
const MAX_WINS = 3;

// Cache para guardar las apuestas activas y el conteo de partidas
// Formato: { userId: { apuesta: number, timestamp: number, playCount: number, wins: number, losses: number } }
const activeBets = new Map();


// ---------------------------------------------------
// UTILIDADES
// ---------------------------------------------------

/**
 * Formatea un número como moneda colombiana (COP) sin decimales.
 * @param {number} cantidad 
 * @returns {string} Cantidad formateada.
 */
const formatoMoneda = (cantidad) => {
    const safeCantidad = Math.max(0, cantidad);
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(safeCantidad);
};

/**
 * Función que extrae el ID, nombre y estado de animación de un emoji personalizado.
 * @param {string} emojiString 
 * @returns {{id?: string, name: string, animated?: boolean}}
 */
function getCustomEmojiObject(emojiString) {
    const match = emojiString.match(/<a?:(\w+):(\d+)>/);
    if (match) {
        return { 
            id: match[2], 
            name: match[1], 
            animated: emojiString.startsWith('<a:'),
        };
    }
    // Retorna un objeto por defecto si falla (usa un emoji Unicode)
    return { name: '✨' }; 
}

// ---------------------------------------------------
// FUNCIONES DE COMPONENTES DE CASINO
// ---------------------------------------------------

/**
 * Construye el menú principal del Casino V2.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {number} balance
 * @returns {import('discord.js').ContainerBuilder} El contenedor del menú.
 */
function buildCasinoMenu(interaction, balance) {
    // Seguridad para Componentes V2 (Botón y Thumbnails)
    const balanceFormateado = formatoMoneda(balance).replace(/\s/g, ''); 
    const moneyEmoji = getCustomEmojiObject(EMOJI_DINERO_ANIM);
    
    const balanceButtonAccessory = new ButtonBuilder()
        .setStyle(ButtonStyle.Secondary)
        .setLabel(balanceFormateado) 
        .setEmoji(moneyEmoji) 
        .setDisabled(true)
        .setCustomId("casino_balance_display");
        
    const listThumbnail = new ThumbnailBuilder()
        .setURL("https://cdn.discordapp.com/attachments/1068711680718151803/1445564047721234602/7313-lista.png?ex=6930cdee&is=692f7c6e&hm=bed53c451d66c3478f8ac09181f06a69fd0329393e7145ae6185d09ac1191c4d");

    const slotThumbnail = new ThumbnailBuilder()
        .setURL("https://cdn.discordapp.com/attachments/1068711680718151803/1445571830512619520/2072-slot-machine.png?ex=6930d52d&is=692f83ad&hm=5dd9d0db93298b932932921208fc83c0654921ac4fdf50f23ff6c3c0dd5244e1df6186");
        
    const ruletaThumbnail = new ThumbnailBuilder()
        .setURL("https://cdn.discordapp.com/attachments/1068711680718151803/1445573846844309544/pngegg.png?ex=6930d70e&is=692f858e&hm=2e460fd3342760dbcbc9ac872d42ae5bfe5fc4601ded782b751d5b133dfd664c");

    const coinflipThumbnail = new ThumbnailBuilder()
        .setURL("https://cdn.discordapp.com/attachments/1068711680718151803/1445575171166703636/pngwing.com.png?ex=6930d84a&is=692f86ca&hm=cfc8e660a65595e826c7063f0204b1b5798257ca34b3b90ba2292408d8b345ba");
    // FIN Seguridad V2
    
    const container = new ContainerBuilder()
        .setAccentColor(0x3498DB) // Azul para el menú
        
        // Bloque 1: Título y Balance (SectionBuilder con ButtonAccessory)
        .addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(balanceButtonAccessory)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_SLOTS_STATIC} Bienvenido al Casino <@${interaction.user.id}>\n\n`),
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // Bloque 2: GIF de Casino (MediaGallery)
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(GIF_LOADING_SPIN), // GIF de máquina girando (Loading)
                ),
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // Bloque 3: Título de Juegos (SectionBuilder con Thumbnail)
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(listThumbnail)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent("## Lista de juegos disponibles.\n\n"),
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // Bloque 4: Slot Machine
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(slotThumbnail)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`### \n> <:675633checkeredone:1445562524761325700>. Slot Machine \`\`\`Tragamonedas sencilla donde se generan tres símbolos aleatorios; si coinciden, el jugador gana. Solo requiere manejar arrays y comparaciones.\`\`\`\n`),
                ),
        )
        
        // Bloque 5: Mini Ruleta
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(ruletaThumbnail)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`###\n> <:675633checkeredtwo:1445562693862949007>. Mini Ruleta \`\`\`Ruleta reducida (1–12) donde el jugador apuesta a número, color o par/impar. El juego elige un número al azar y paga según la apuesta.\`\`\`\n`),
                ),
        )
        
        // Bloque 6: Coinflip
        .addSectionComponents(
            new SectionBuilder()
                .setThumbnailAccessory(coinflipThumbnail)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`###\n> <:757226checkeredthree:1445562960943648839> Coinflip \`\`\`Juego de “cara o sello” con apuesta. Se genera 0 o 1 aleatoriamente y, si coincide con la elección del jugador, gana el doble.\`\`\`\n`),
                ),
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // Bloque 7: Menú de Selección (ActionRow con SelectMenu)
        .addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("casino_game_selector")
                        .setPlaceholder("Selecciona el juego.")
                        .addOptions(
                            new SelectMenuOptionBuilder()
                                .setLabel("Slot Machine")
                                .setValue("slot_machine") 
                                .setDescription("Tragamonedas")
                                .setEmoji({ id: "1445562524761325700", name: "675633checkeredone", animated: false }),
                            new SelectMenuOptionBuilder()
                                .setLabel("Mini Ruleta")
                                .setValue("mini_roulette")
                                .setDescription("Ruleta reducida (1–12)")
                                .setEmoji({ id: "1445562693862949007", name: "675633checkeredtwo", animated: false }),
                            new SelectMenuOptionBuilder()
                                .setLabel("Coinflip")
                                .setValue("coinflip")
                                .setDescription("Juego de “cara o sello” con apuesta.")
                                .setEmoji({ id: "1445562960943648839", name: "757226checkeredthree", animated: false }),
                        ),
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // Bloque 8: Pie de Página (TextDisplay)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${EMOJI_STAR_ANIM} *⛄| [ER:LC] México Nuevo Laredo, Roleplay | Casino*`),
        );
        
    return container;
}

/**
 * Función que crea el menú de selección de apuesta del Slot Machine.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {number} balance
 * @returns {import('discord.js').ContainerBuilder} El contenedor de selección de Slot.
 */
function buildSlotMachineSelection(interaction, balance) {
    const contenedorSlot = new ContainerBuilder()
        .setAccentColor(0x9B59B6) // Púrpura para la interfaz de juego
        
        // Bloque 1: Título y Balance
        .addSectionComponents(
            new SectionBuilder()
                .setButtonAccessory(
                    new ButtonBuilder()
                        .setStyle(ButtonStyle.Secondary)
                        .setLabel(formatoMoneda(balance).replace(/\s/g, ''))
                        .setEmoji(getCustomEmojiObject(EMOJI_DINERO_ANIM))
                        .setDisabled(true)
                        .setCustomId("slot_balance_display")
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_SLOT_ICON} Slot Machine. \n\n`)
                )
        )
        
        // Bloque 2: GIF de Slot 
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(GIF_LOADING_SPIN), 
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // Bloque 3: Selección de Porcentaje de Apuesta (Select Menu)
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### ${EMOJI_DINERO_STATIC} ¿Cuánto dinero quieres apostar?`)
        )

        .addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("slot_bet_percent") 
                        .setPlaceholder("Selecciona el porcentaje de tu cartera")
                        .addOptions(
                            new SelectMenuOptionBuilder()
                                .setLabel("15% - " + formatoMoneda(balance * 0.15))
                                .setValue("15") 
                                .setDescription(`15% de tu cartera (${formatoMoneda(balance * 0.15)})`)
                                .setEmoji({ id: "1445584279357755422", name: "5639cash2", animated: false }),
                            new SelectMenuOptionBuilder()
                                .setLabel("20% - " + formatoMoneda(balance * 0.20))
                                .setValue("20") 
                                .setDescription(`20% de tu cartera (${formatoMoneda(balance * 0.20)})`)
                                .setEmoji({ id: "1445584279357755422", name: "5639cash2", animated: false }),
                            new SelectMenuOptionBuilder()
                                .setLabel("25% - " + formatoMoneda(balance * 0.25))
                                .setValue("25") 
                                .setDescription(`25% de tu cartera (${formatoMoneda(balance * 0.25)})`)
                                .setEmoji({ id: "1445584279357755422", name: "5639cash2", animated: false }),
                        ),
                ),
        )

        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // Bloque 4: Apuesta de Cantidad Específica (Botón Modal)
        .addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("slot_bet_modal") 
                        .setLabel("Cantidad específica")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji({ id: "1445584279357755422", name: "5639cash2", animated: false })
                )
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        // Bloque 5: Botón de Regresar
        .addActionRowComponents(
            new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId("slot_back") 
                        .setLabel("⬅️ Regresar al Menú Principal")
                        .setStyle(ButtonStyle.Secondary)
                )
        );
        
    return contenedorSlot;
}

/**
 * Muestra el resultado final del Slot Machine.
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ButtonInteraction | import('discord.js').ModalSubmitInteraction} interaction
 * @param {string[]} symbols - Array de 3 símbolos [S1, S2, S3]
 * @param {number} betAmount - Cantidad apostada
 * @param {number} winAmount - Cantidad ganada (0 si pierde)
 * @param {number} newBalance - Nuevo balance del usuario
 * @returns {{components: (ContainerBuilder|ActionRowBuilder)[], content: string, flags: number, ephemeral: boolean}}
 */
function buildSlotMachineResult(interaction, symbols, betAmount, winAmount, newBalance) {
    const isWin = winAmount > 0;
    const color = isWin ? 0x2ECC71 : 0xE74C3C; // Verde o Rojo
    const resultadoEmoji = isWin ? EMOJI_WIN : EMOJI_ERROR;
    const resultadoTexto = isWin ? "Ganastes." : "Perdistes.";
    const resultGif = isWin ? GIF_WINNER : GIF_LOOSER;
    const symbolsDisplay = `${symbols[0]} |  ${symbols[1]}  |  ${symbols[2]}`;
    const betInfo = activeBets.get(interaction.user.id) || { playCount: 0 };
    
    // Botón accesorio con el balance actualizado (para el resultado)
    const balanceAccessoryButton = new ButtonBuilder()
        .setStyle(isWin ? ButtonStyle.Success : ButtonStyle.Danger) // Verde si gana, Rojo si pierde
        .setLabel(formatoMoneda(newBalance).replace(/\s/g, ''))
        .setEmoji(getCustomEmojiObject(EMOJI_CASH_ANIM))
        .setDisabled(true)
        .setCustomId("result_balance_display");

    // Cálculo del balance anterior
    const previousBalance = newBalance + betAmount - winAmount;

    // Botón de jugar de nuevo (deshabilitado si se alcanzó el límite)
    const playAgainButton = new ButtonBuilder()
        .setCustomId("slot_play")
        .setLabel("Jugar de Nuevo")
        .setStyle(ButtonStyle.Success)
        .setEmoji({ name: '🎰' })
        .setDisabled(betInfo.playCount >= MAX_PLAYS);

    // Botón de regresar
    const backButton = new ButtonBuilder()
        .setCustomId("slot_back")
        .setLabel("Regresar al Menú")
        .setStyle(ButtonStyle.Secondary);

    // V1 ActionRow para botones 
    const actionRowButtons = new ActionRowBuilder().addComponents(playAgainButton, backButton);

    const resultContainer = new ContainerBuilder()
        .setAccentColor(color)
        .addSectionComponents(
            // Bloque 1: Título y Avatar (Thumbnail)
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_RESULTADO} RESULTADO FINAL. \n\n`)
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(BOT_AVATAR_URL)
                )
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )

        .addSectionComponents(
            // Bloque 2: Resultado del Giro, Ganancia/Pérdida y Balance (con ButtonAccessory)
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ${EMOJI_DINERO_ANIM} RESULTADO DE LA MAQUINA: \n# \`\`\` ${symbolsDisplay} \`\`\`\n\n` +
                        `## ${resultadoEmoji} ${resultadoTexto}\n\n` +
                        `> Balance Anterior: \`\`\`${formatoMoneda(previousBalance)}\`\`\`\n` +
                        `> Balance Actual: \`\`\`${formatoMoneda(newBalance)}\`\`\``
                    )
                )
                .setButtonAccessory(balanceAccessoryButton)
        )
        
        // Bloque 3: GIF de Resultado
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(resultGif)
                        .setDescription(isWin ? "Gif de ganancia" : "Gif de perdida")
                ),
        )
        
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        
        // Bloque 4: Conteo de partidas
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`### 🎲 Partida ${betInfo.playCount} de ${MAX_PLAYS}\n\n`)
        );
        
    return { 
        components: [resultContainer, actionRowButtons], // Combina Container V2 y ActionRow V1
        content: '', 
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    };
}


/**
 * Determina si la próxima partida debe ser una victoria (True) o una derrota (False)
 * basándose en el límite de 8 partidas (5 pérdidas, 3 victorias).
 * @param {string} userId
 * @returns {boolean}
 */
function isWinAllowed(userId) {
    let betInfo = activeBets.get(userId);

    // Si es la primera partida o el caché está corrupto, inicializar.
    if (!betInfo || betInfo.playCount === undefined) {
        // Esto no debería pasar si se maneja correctamente en /casino y handleCasinoGameSelection
        betInfo = { apuesta: 0, timestamp: Date.now(), playCount: 0, wins: 0, losses: 0 };
        activeBets.set(userId, betInfo);
    }
    
    // Si ya se alcanzó el límite total de 8
    if (betInfo.playCount >= MAX_PLAYS) {
        return false; 
    }
    
    // 1. Si ya se alcanzaron las 3 victorias, forzar derrota.
    if (betInfo.wins >= MAX_WINS) {
        return false;
    }
    
    // 2. Si quedan exactamente las partidas necesarias para alcanzar las 3 victorias (y no hemos alcanzado las 5 pérdidas), forzar victoria.
    const remainingPlays = MAX_PLAYS - betInfo.playCount;
    const winsNeeded = MAX_WINS - betInfo.wins;
    const lossesPossible = MAX_LOSSES - betInfo.losses;

    // Si las victorias que faltan (winsNeeded) son iguales a las partidas que quedan (remainingPlays), ¡debemos ganar!
    if (winsNeeded === remainingPlays) {
        return true; 
    }

    // 3. Si la victoria es posible y la derrota es posible, calcular probabilidad.
    // La probabilidad se calcula dinámicamente para asegurar que se cumpla el 3/5.
    const winProbability = winsNeeded / (winsNeeded + lossesPossible);
    
    return Math.random() < winProbability;
}

/**
 * Ejecuta el juego de Slot Machine y actualiza el balance. (LÓGICA DE PROBABILIDAD MEJORADA)
 * @param {import('discord.js').ChatInputCommandInteraction | import('discord.js').ButtonInteraction | import('discord.js').ModalSubmitInteraction} interaction
 * @param {number} betAmount - Cantidad apostada
 */
async function runSlotMachine(interaction, betAmount) {
    const userId = interaction.user.id;
    let winAmount = 0;
    let betInfo = activeBets.get(userId);
    const isWinningRound = isWinAllowed(userId); // Determinar el resultado forzado

    // 1. Obtener los 3 símbolos aleatorios (Aseguramos una ganancia o una derrota si es forzado)
    let symbols;

    if (isWinningRound) {
        // Forzar Ganancia (Asegurar al menos 2 iguales para el pago de 1.5x)
        const possibleSymbols = SLOT_SYMBOLS.filter(s => s !== '💰' && s !== '💎'); // Evitar premios gordos forzados
        const winningSymbol = possibleSymbols[Math.floor(Math.random() * possibleSymbols.length)];
        
        // 50% de probabilidad de 3 iguales (pago > 1.5x)
        if (Math.random() < 0.5) {
             symbols = [winningSymbol, winningSymbol, winningSymbol];
        } else {
             // Forzar 2 iguales (pago 1.5x)
             const nonWinningSymbols = SLOT_SYMBOLS.filter(s => s !== winningSymbol);
             const thirdSymbol = nonWinningSymbols[Math.floor(Math.random() * nonWinningSymbols.length)];
             
             symbols = [winningSymbol, winningSymbol, thirdSymbol];
             symbols.sort(() => Math.random() - 0.5); // Mezclar
        }

    } else {
        // Forzar Derrota (No 3 iguales, y si hay 2 iguales, no pagan)
        symbols = Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
        
        // Asegurarse de que NO haya 3 iguales
        while (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
             symbols = Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]);
        }
    }

    // 2. Calcular la ganancia real
    if (symbols[0] === symbols[1] && symbols[1] === symbols[2]) {
        // Opción A: 3 Símbolos iguales
        const winningSymbol = symbols[0];
        const multiplier = PAYOUTS[winningSymbol];
        winAmount = multiplier * betAmount; 
    } 
    else if (symbols[0] === symbols[1] || symbols[1] === symbols[2] || symbols[0] === symbols[2]) {
        // Opción B: 2 Símbolos iguales
        if (isWinningRound) {
             winAmount = Math.floor(betAmount * 1.5); // 1.5x la apuesta (Si se permitió la victoria)
        } else {
             winAmount = 0; // Si es derrota forzada, 2 símbolos no pagan
        }
    } else {
        winAmount = 0; // 0 o 1 símbolo igual
    }

    // 3. Actualizar contadores de partidas (ANTES de actualizar la DB)
    betInfo.playCount += 1;
    if (winAmount > 0) {
        betInfo.wins += 1;
    } else {
        betInfo.losses += 1;
    }
    activeBets.set(userId, betInfo); // Guardar el conteo actualizado

    // 4. Calcular la variación total del balance
    const balanceChange = winAmount - betAmount; 

    // 5. Actualizar el balance en la DB
    const usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
    if (!usuarioEconomia) {
        throw new Error("Cuenta de economía no encontrada al ejecutar Slot Machine.");
    }

    // Aseguramos que el balance no sea negativo
    const newBalance = Math.max(0, usuarioEconomia.cartera + balanceChange);
    
    // Aplicar la actualización
    await usuarioEconomia.update({ cartera: newBalance });

    // 6. Construir y enviar el resultado
    const resultComponents = buildSlotMachineResult(interaction, symbols, betAmount, winAmount, newBalance);
    await interaction.editReply(resultComponents);
}


// ---------------------------------------------------
// MANEJADORES DE INTERACCIONES
// ---------------------------------------------------

/**
 * Muestra el menú de selección de juego del Casino.
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {string} selectedValue
 */
async function handleCasinoGameSelection(interaction, selectedValue) {
    
    const userId = interaction.user.id;
    
    await interaction.deferUpdate(); // Aseguramos que la interacción del Select Menu se maneja.
    
    // 1. Obtener balance
    let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });

    // 2. Manejo de Slot Machine
    if (selectedValue === 'slot_machine') {
        
        if (!usuarioEconomia) {
            // Error V2: Cuenta no Encontrada
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xE74C3C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Cuenta no Encontrada`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("No tienes una cuenta de economía registrada."));
            
            return interaction.editReply({ 
                components: [errorContainer],
                content: '', // VACÍO
                flags: MessageFlags.IsComponentsV2,
                ephemeral: true,
            });
        }
        
        // Limpiar/Reiniciar la apuesta y el contador al seleccionar el juego
        activeBets.set(userId, { apuesta: 0, timestamp: Date.now(), playCount: 0, wins: 0, losses: 0 });
        
        const slotMenuContainer = buildSlotMachineSelection(interaction, usuarioEconomia.cartera);
        
        // 🚨 La interfaz del juego se muestra pública
        await interaction.editReply({ 
            components: [slotMenuContainer], 
            content: '', 
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false 
        });
    } else {
        // Manejo de otros juegos 
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xF1C40F)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Función no Disponible`))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent("El sistema de casino aún no ha completado este juego. ¡Esté atento a los anuncios!"));

        await interaction.editReply({ 
            components: [errorContainer],
            content: '',
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true,
        });
    }
}


/**
 * Maneja los botones de Slot Machine (Jugar de Nuevo y Regresar).
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleSlotMachineButtons(interaction) {
    const userId = interaction.user.id;
    
    // 1. Botón de Regresar
    if (interaction.customId === 'slot_back') {
        // Limpiar apuesta y conteo al salir del juego
        activeBets.delete(userId); 
        
        let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
        const balance = usuarioEconomia ? usuarioEconomia.cartera : 0;

        const casinoMenuContainer = buildCasinoMenu(interaction, balance);
        
        await interaction.editReply({ 
            components: [casinoMenuContainer], 
            content: '',
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false // El menú principal es público
        });
        return;
    }

    // 2. Botón de Jugar de Nuevo (Re-ejecutar el Slot con la apuesta anterior)
    if (interaction.customId === 'slot_play') {
        const activeBet = activeBets.get(userId);

        // Si no hay apuesta activa o ya alcanzó el límite, volver al menú de selección de apuesta
        if (!activeBet || activeBet.playCount >= MAX_PLAYS) {
             const usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
             const balance = usuarioEconomia ? usuarioEconomia.cartera : 0;
             
             // Mensaje de Límite Alcanzado
             const errorContainer = new ContainerBuilder()
                .setAccentColor(0xE74C3C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Límite de Partidas Alcanzado`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Has alcanzado el límite de **${MAX_PLAYS} partidas** de Slot Machine. Regresa al menú principal y vuelve a intentarlo más tarde.`));
             
             // Forzamos el regreso al menú principal después del error
             const casinoMenuContainer = buildCasinoMenu(interaction, balance);
             
             // 🚨 Mostramos el límite y el menú principal
             await interaction.editReply({ 
                 components: [errorContainer, casinoMenuContainer], 
                 content: '', 
                 flags: MessageFlags.IsComponentsV2,
                 ephemeral: false 
             });
             activeBets.delete(userId); // Limpiar el caché
             return;
        }
        
        const betAmount = activeBet.apuesta;

        // Verificar el balance actual ANTES de hacer la apuesta
        let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
        const balance = usuarioEconomia ? usuarioEconomia.cartera : 0;

        if (!usuarioEconomia || balance < betAmount) {
            // Balance insuficiente, volver al menú de selección
            const slotMenuContainer = buildSlotMachineSelection(interaction, balance);
            
            // Error V2: Balance insuficiente
            const errorContainer = new ContainerBuilder()
                .setAccentColor(0xE74C3C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Balance Insuficiente`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`No tienes suficiente dinero (**${formatoMoneda(betAmount)}**) para repetir la apuesta.`))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Tu balance actual es: ${formatoMoneda(balance)}*`));
            
            // 🚨 Mostramos el error y el menú de selección de slot
            await interaction.editReply({ 
                components: [errorContainer, slotMenuContainer], 
                content: '', 
                flags: MessageFlags.IsComponentsV2,
                ephemeral: false 
            });
            return;
        }
        
        // Ejecutar el juego
        await handleSlotBet(interaction, betAmount);
        return;
    }
}

/**
 * Maneja la apuesta del Slot Machine (Select Menu y Modal Submit). (ACTUALIZADA con Carga JSON y Límite)
 * @param {import('discord.js').StringSelectMenuInteraction | import('discord.js').ModalSubmitInteraction | import('discord.js').ButtonInteraction} interaction
 * @param {number | string} rawBetAmount - Cantidad de la apuesta (puede ser un porcentaje, un monto fijo o el monto del caché)
 */
async function handleSlotBet(interaction, rawBetAmount) {
    const userId = interaction.user.id;
    let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
    let betInfo = activeBets.get(userId);

    // Función para manejar errores de validación
    const sendErrorReply = async (message) => {
        const balance = usuarioEconomia ? usuarioEconomia.cartera : 0;
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xE74C3C)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Error de Apuesta`))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(message))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`*Balance actual: ${formatoMoneda(balance)}*`));
            
        const slotMenuContainer = buildSlotMachineSelection(interaction, balance);

        return interaction.editReply({ 
            components: [errorContainer, slotMenuContainer],
            content: '', 
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false,
        });
    }

    if (!usuarioEconomia) {
        return sendErrorReply("No tienes una cuenta de economía registrada para apostar.");
    }
    
    let betAmount = 0;
    
    // 1. Calcular la apuesta final
    if (interaction.isStringSelectMenu()) {
        const percentage = parseFloat(rawBetAmount) / 100;
        betAmount = Math.floor(usuarioEconomia.cartera * percentage);
    } else if (interaction.isModalSubmit() || interaction.isButton()) {
        betAmount = Math.floor(parseFloat(rawBetAmount)); 
    }

    // 2. Validaciones
    if (betAmount <= 0) {
        return sendErrorReply(`La apuesta debe ser mayor a ${formatoMoneda(0)}.`);
    }

    if (betAmount > usuarioEconomia.cartera) {
        return sendErrorReply(`No tienes suficiente dinero. Estás apostando **${formatoMoneda(betAmount)}**.`);
    }

    // 3. Guardar la apuesta en el caché (solo se actualiza el monto de apuesta, el contador se maneja en runSlotMachine/isWinAllowed)
    if (!betInfo) {
        // Esto solo debería pasar si el comando /casino no se ejecutó, pero lo inicializamos por seguridad
        betInfo = { apuesta: betAmount, timestamp: Date.now(), playCount: 0, wins: 0, losses: 0 };
    } else {
        betInfo.apuesta = betAmount;
    }
    activeBets.set(userId, betInfo);


    // 4. Indicar que el juego va a empezar (Mensaje de carga - ACTUALIZADO con formato JSON)
    const loadingContainer = new ContainerBuilder()
        .setAccentColor(0x9B59B6)
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(`## ${EMOJI_NEW_LOADING} MAQUINA GIRANDO `),
                )
                .setThumbnailAccessory(
                    new ThumbnailBuilder().setURL(BOT_AVATAR_URL)
                )
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        .addMediaGalleryComponents(
            new MediaGalleryBuilder()
                .addItems(
                    new MediaGalleryItemBuilder()
                        .setURL(GIF_SPINNING_SLOT)
                        .setDescription("Slot machine spinning")
                ),
        )
        .addSeparatorComponents(
            new SeparatorBuilder().setSpacing(SEPARATOR_SPACING_SMALL).setDivider(true),
        )
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### <:238591money:1445520558254067884> Apuesta: \`\`\`${formatoMoneda(betAmount)}\`\`\`\n` +
                `### 🎲 Partida ${betInfo.playCount + 1} de ${MAX_PLAYS}\n\n` +
                `*Esperando el resultado...*`
            )
        );

    // 🚨 Editar respuesta con el mensaje de carga
    await interaction.editReply({ 
        components: [loadingContainer], 
        content: '', 
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false
    });
    
    // 5. Esperar 3 segundos para simular la carga
    await sleep(3000); 

    // 6. Ejecutar el juego real y enviar el resultado
    await runSlotMachine(interaction, betAmount);
}

// ---------------------------------------------------
// MANEJADOR DE MODAL 
// ---------------------------------------------------

/**
 * Muestra el Modal para ingresar una cantidad específica.
 * @param {import('discord.js').ButtonInteraction} interaction
 */
async function handleSlotBetModal(interaction) {
    const userId = interaction.user.id;
    let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });
    const balance = usuarioEconomia ? usuarioEconomia.cartera : 0;
    
    const modal = new ModalBuilder()
        .setCustomId('slot_modal_submit')
        .setTitle('🎰 Apuesta Específica - Slot Machine')
        
    const input = new TextInputBuilder()
        .setCustomId('bet_amount_input')
        .setLabel(`Tu Balance es: ${formatoMoneda(balance)}`)
        .setPlaceholder('Ingresa la cantidad a apostar (ej: 100000)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
}


// ---------------------------------------------------
// EXPORTACIÓN DE COMANDO Y HANDLERS
// ---------------------------------------------------

module.exports = {
  data: new SlashCommandBuilder()
    .setName('casino')
    .setDescription('Abre el menú principal del Casino de México Nuevo Laredo [ER:LC].'),

  async execute(interaction) {
    // 1. Deferir la respuesta para la interacción inicial
    await interaction.deferReply({ ephemeral: false }); 

    const userId = interaction.user.id;
    const channelId = interaction.channelId;
    
    // 2. Validación del canal
    if (channelId !== CANAL_PERMITIDO) {
        const errorContainer = new ContainerBuilder()
            .setAccentColor(0xE74C3C)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${EMOJI_ERROR} Canal No Permitido`))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(`Este comando solo puede ser ejecutado en el canal <#${CANAL_PERMITIDO}>.`));
        
        // Usamos editReply porque ya se hizo deferReply
        return interaction.editReply({ 
            components: [errorContainer],
            content: '', 
            flags: MessageFlags.IsComponentsV2,
            ephemeral: true, // El error sí es efímero
        });
    }

    // 3. Obtener balance
    let usuarioEconomia = await Economia.findOne({ where: { discordId: userId } });

    if (!usuarioEconomia) {
        // Inicializar cuenta si no existe (con balance 0)
        usuarioEconomia = await Economia.create({ discordId: userId, cartera: 0 });
    }
    
    // Limpiar/Reiniciar el estado de juego al abrir el menú principal
    activeBets.set(userId, { apuesta: 0, timestamp: Date.now(), playCount: 0, wins: 0, losses: 0 });

    // 4. Construir y enviar el menú principal
    const casinoMenuContainer = buildCasinoMenu(interaction, usuarioEconomia.cartera);
    
    await interaction.editReply({
        components: [casinoMenuContainer],
        content: '',
        flags: MessageFlags.IsComponentsV2,
        ephemeral: false // Menú principal es público
    });
  },
  
  handlers: {
      handleCasinoGameSelection,
      handleSlotBet,
      handleSlotBetModal,
      handleSlotMachineButtons,
  }
};