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

    // Manejar aprobación/rechazo de préstamos
    const fs = require('fs');
    const path = require('path');
    const Economia = require('./models/Economia');
    const solicitudesPath = path.join(__dirname, 'data/loan_requests.json');
    if (!fs.existsSync(solicitudesPath)) return;
    let solicitudes = JSON.parse(fs.readFileSync(solicitudesPath, 'utf8'));
    const pendienteIdx = solicitudes.findIndex(s => s.estado === 'pendiente');
    if (pendienteIdx === -1) return;
    const solicitud = solicitudes[pendienteIdx];
    if (interaction.customId === 'aprobar-prestamo') {
      // Sumar el monto del préstamo al banco del usuario
      Economia.findOne({ where: { discordId: solicitud.userId } }).then(async userEco => {
        if (userEco) {
          userEco.banco += solicitud.loan.monto;
          await userEco.save();
        }
        solicitudes[pendienteIdx].estado = 'aprobado';
        fs.writeFileSync(solicitudesPath, JSON.stringify(solicitudes, null, 2));
        // Notificar al usuario por DM
        try {
          const user = await interaction.client.users.fetch(solicitud.userId);
          await user.send(`¡Felicidades! Tu solicitud de préstamo (**${solicitud.loan.nombre}**) ha sido aprobada y el monto ha sido depositado en tu cuenta bancaria.`);
        } catch (e) {
          logBox('Notificación', `No se pudo enviar DM a ${solicitud.username} (${solicitud.userId})`, 'WARN');
        }
        await interaction.update({ content: `Préstamo aprobado y depositado a ${solicitud.username}.`, embeds: [], components: [] });
      });
    } else if (interaction.customId === 'rechazar-prestamo') {
      solicitudes[pendienteIdx].estado = 'rechazado';
      fs.writeFileSync(solicitudesPath, JSON.stringify(solicitudes, null, 2));
      // Notificar al usuario por DM
      try {
        const user = await interaction.client.users.fetch(solicitud.userId);
        await user.send(`Tu solicitud de préstamo (**${solicitud.loan.nombre}**) ha sido rechazada por un administrador.`);
      } catch (e) {
        logBox('Notificación', `No se pudo enviar DM a ${solicitud.username} (${solicitud.userId})`, 'WARN');
      }
      await interaction.update({ content: `Solicitud rechazada.`, embeds: [], components: [] });
    }
  }

  // Manejar selección de préstamo y cuentas bancarias (select menu)
  if (interaction.isStringSelectMenu && interaction.isStringSelectMenu()) {
    if (interaction.customId === 'select-loan') {
      // ...existing code...
      const fs = require('fs');
      const path = require('path');
      const Economia = require('./models/Economia');
      const loansPath = path.join(__dirname, 'data/loans.json');
      let loans = [];
      if (fs.existsSync(loansPath)) {
        loans = JSON.parse(fs.readFileSync(loansPath, 'utf8'));
      }
      const selected = interaction.values[0];
      const loan = loans[parseInt(selected)];
      if (!loan) {
        await interaction.reply({ content: 'Préstamo no encontrado.', ephemeral: true });
        return;
      }
      const user = interaction.user;
      const solicitudesPath = path.join(__dirname, 'data/loan_requests.json');
      let solicitudes = [];
      if (fs.existsSync(solicitudesPath)) {
        solicitudes = JSON.parse(fs.readFileSync(solicitudesPath, 'utf8'));
      }
      solicitudes.push({
        userId: user.id,
        username: user.username,
        loan,
        fecha: new Date().toISOString(),
        estado: 'pendiente'
      });
      fs.writeFileSync(solicitudesPath, JSON.stringify(solicitudes, null, 2));
      await interaction.reply({
        content: `Solicitud enviada para el préstamo **${loan.nombre}**. Un administrador revisará tu solicitud.`,
        ephemeral: true
      });
    } else if (interaction.customId === 'select-bank') {
      // Mostrar tipos de cuenta del banco seleccionado
      const fs = require('fs');
      const path = require('path');
      const accountsPath = path.join(__dirname, 'data/debit_accounts.json');
      if (!fs.existsSync(accountsPath)) {
        await interaction.reply({ content: 'No hay tipos de cuenta disponibles.', ephemeral: true });
        return;
      }
      const cuentas = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
      const bancoId = interaction.values[0];
      const tipos = cuentas.filter(c => c.bancoId === bancoId);
      if (tipos.length === 0) {
        await interaction.reply({ content: 'No hay tipos de cuenta para este banco.', ephemeral: true });
        return;
      }
      const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
      const tipoMenu = new StringSelectMenuBuilder()
        .setCustomId('select-account-type')
        .setPlaceholder('Selecciona un tipo de cuenta')
        .addOptions(tipos.map((t, i) => ({
          label: t.nombre + ` (Mantenimiento: ${t.costo}%, Interés: ${t.interes}%)`,
          value: bancoId + '|' + i
        })));
      const row = new ActionRowBuilder().addComponents(tipoMenu);
      await interaction.reply({ content: 'Selecciona un tipo de cuenta:', components: [row], ephemeral: true });
    } else if (interaction.customId === 'select-account-type') {
      // Crear cuenta bancaria para el usuario
      const fs = require('fs');
      const path = require('path');
      const Economia = require('./models/Economia');
      const accountsPath = path.join(__dirname, 'data/debit_accounts.json');
      if (!fs.existsSync(accountsPath)) {
        await interaction.reply({ content: 'No hay tipos de cuenta disponibles.', ephemeral: true });
        return;
      }
      const cuentas = JSON.parse(fs.readFileSync(accountsPath, 'utf8'));
      const [bancoId, idx] = interaction.values[0].split('|');
      const tipo = cuentas.filter(c => c.bancoId === bancoId)[parseInt(idx)];
      if (!tipo) {
        await interaction.reply({ content: 'Tipo de cuenta no encontrado.', ephemeral: true });
        return;
      }
      let userEco = await Economia.findOne({ where: { discordId: interaction.user.id } });
      if (!userEco) {
        userEco = await Economia.create({ discordId: interaction.user.id });
      }
      userEco.bancoNombre = tipo.nombre;
      userEco.cuentaTipo = tipo.nombre;
      userEco.tasaInteres = tipo.interes;
      await userEco.save();
      await interaction.reply({ content: `¡Cuenta bancaria creada en **${tipo.nombre}**!\nMantenimiento: ${tipo.costo}%\nInterés anual: ${tipo.interes}%`, ephemeral: true });
    }
  }
});

// ╭───────────────────────────────╮
// │ 🔑 LOGIN                    │
// ╰───────────────────────────────╯
client.login(process.env.DISCORD_TOKEN)
  .then(() => logBox("Login", "Conectado correctamente", "SUCCESS"))
  .catch(err => logBox("Login", err.message, "ERROR"));
