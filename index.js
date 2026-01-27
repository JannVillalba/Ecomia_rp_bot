// index.js (CORREGIDO)

const { MessageFlags } = require('discord.js');
require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  Collection,
  ActivityType,
  Events,
} = require('discord.js');

// DB Economía
const sequelizeEconomia = require('./utils/db');

// ╭───────────────────────────────╮
// │ ⚙️ UTILIDADES               │
// ╰───────────────────────────────╯
const logBox = (title, message, type = "INFO") => {
  const colors = {
    INFO: "\x1b[36m",
    SUCCESS: "\x1b[32m",
    ERROR: "\x1b[31m",
    WARN: "\x1b[33m",
  };
  const reset = "\x1b[0m";
  console.log(`
╔════════════════════════════════════════════════╗
║ ${colors[type]}${title.padEnd(20)}${reset} │ ${message}
╚════════════════════════════════════════════════╝`);
};

const EMOJI_ERROR = "❌";

// ╭───────────────────────────────╮
// │ 🤖 CLIENTE                  │
// ╰───────────────────────────────╯
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
});

client.commands = new Collection();

// ╭───────────────────────────────╮
// │ 📦 CARGA DE COMANDOS         │
// ╰───────────────────────────────╯
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

logBox("Cargando", "Comandos...", "INFO");

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (command?.data && command?.execute) {
    client.commands.set(command.data.name, command);
    logBox("Comando", command.data.name, "SUCCESS");
  } else {
    logBox("Advertencia", `${file} inválido`, "WARN");
  }
}

// ╭───────────────────────────────╮
// │ 🚀 BOT LISTO                │
// ╰───────────────────────────────╯
client.once(Events.ClientReady, async () => {
  client.user.setPresence({
    activities: [{
      name: '💸 Economía | New York Roleplay [ER:LC]',
      type: ActivityType.Watching,
    }],
    status: 'online',
  });

  logBox("BOT ONLINE", client.user.tag, "SUCCESS");

  try {
    await sequelizeEconomia.sequelize.authenticate();
    await sequelizeEconomia.syncModels();
    logBox("DB ECONOMÍA", "Conectada y sincronizada", "SUCCESS");
  } catch (error) {
    logBox("DB ECONOMÍA", error.message, "ERROR");
  }
});

// ╭───────────────────────────────╮
// │ 📩 INTERACCIONES            │
// ╰───────────────────────────────╯
client.on(Events.InteractionCreate, async interaction => {

  // Slash Commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);

      logBox(
        "Comando",
        `${interaction.commandName} → ${interaction.user.tag}`,
        "INFO"
      );

    } catch (error) {
      logBox("Error", error.message, "ERROR");

      const msg = `${EMOJI_ERROR} Error al ejecutar el comando.`;

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: msg });
      } else {
        await interaction.reply({ content: msg, flags: MessageFlags.Ephemeral });
      }
    }
  }

  // 🔘 Botones / Modales / Selects (economía)
  if (interaction.isButton()) {
    // Manejar botones de comprar-dinero
    const comprarDineroCmd = client.commands.get('comprar-dinero');
    if (comprarDineroCmd && typeof comprarDineroCmd.handleButton === 'function') {
      try {
        await comprarDineroCmd.handleButton(interaction);
      } catch (error) {
        logBox('Error', error.message, 'ERROR');
        await interaction.reply({ content: `${EMOJI_ERROR} Error al procesar el botón.`, ephemeral: true });
      }
    }
  }
});

// ╭───────────────────────────────╮
// │ 🔑 LOGIN                    │
// ╰───────────────────────────────╯
client.login(process.env.DISCORD_TOKEN)
  .then(() => logBox("Login", "Conectado correctamente", "SUCCESS"))
  .catch(err => logBox("Login", err.message, "ERROR"));
