const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder
} = require('discord.js');
const express = require('express');
const info = require('./info.js');

// --- Keep-alive Server para hindi matulog sa Render ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Dr.Blaze Bot is running!'));
app.listen(PORT, () => console.log(`✅ Keep-alive server active`));

// --- Token mula sa Environment Variable (ligtas, hindi nakikita) ---
const BOT_TOKEN = process.env.BOT_TOKEN;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages
  ]
});

// 📌 Storage
const serverConfig = new Map();
const userMessageCache = new Map();
const pendingResetRequests = new Map();

// ✅ Embed Style
function redEmbed(title, description = null) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Dr.Blaze | Protection System' });

  if (description) embed.setDescription(description);
  return embed;
}

// 📝 Commands
const commands = [
  new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Enable the server protection system'),

  new SlashCommandBuilder()
    .setName('antispam')
    .setDescription('Enable or disable protection against spam'),

  new SlashCommandBuilder()
    .setName('antilink')
    .setDescription('Enable or disable blocking of invite links'),

  new SlashCommandBuilder()
    .setName('whitelist')
    .setDescription('Manage roles exempt from protection rules')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a role to the whitelist')
        .addRoleOption(option => option.setName('role').setDescription('Select the role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove a role from the whitelist')
        .addRoleOption(option => option.setName('role').setDescription('Select the role').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show all whitelisted roles')
    ),

  new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Clear all settings and reset the system'),

  new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View a member’s profile')
    .addUserOption(option => option.setName('user').setDescription('Select a user').setRequired(false)),

  new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('View a user’s avatar')
    .addUserOption(option => option.setName('user').setDescription('Select a user').setRequired(false)),

  new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('View server information')
];

// ⚙️ Register commands
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

client.on('ready', async () => {
  console.log(`✅ Dr.Blaze | Online & Ready!`);
  try {
    console.log('🔄 Registering commands...');
    await rest.put(
      Routes.applicationCommands(client.user.id),
      { body: commands.map(cmd => cmd.toJSON()) }
    );
    console.log('✅ All commands are ready to use!');
  } catch (err) {
    console.error('❌ Error registering commands:', err);
  }
});

// 📌 Handle commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const guildId = interaction.guild.id;
  const guild = interaction.guild;
  const member = interaction.member;
  const cmd = interaction.commandName;

  const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                         member.permissions.has(PermissionsBitField.Flags.Administrator);

  if (!hasPermission) {
    return interaction.reply({ embeds: [redEmbed('❌ Access Denied', 'You need **Manage Server** or **Administrator** permission to use this command.')], flags: 64 });
  }

  try {
    // 🚀 Setup - Fast & Aggressive Mode
    if (cmd === 'setup') {
      if (serverConfig.has(guildId)) {
        return interaction.reply({ embeds: [redEmbed('⚠️ Already Configured', 'This server has already been set up.')] });
      }

      serverConfig.set(guildId, {
        antiSpam: true,
        antiLink: true,
        whitelistRoles: [],
        maxSameMessages: 2,        // Trigger sa 2nd message pa lang
        timeLimit: 5000,          // Bantay sa loob ng 5 segundo
        resetCooldown: 8000       // Bumalik sa normal pagkalipas ng 8 segundo ng tahimik
      });

      return interaction.reply({ embeds: [redEmbed('✅ Setup Complete', 'Protection system enabled.\n\nAvailable commands:\n`/antispam` - Toggle spam protection\n`/antilink` - Toggle link protection\n`/whitelist` - Manage allowed roles\n`/reset` - Clear all settings')] });
    }

    // 🔄 Reset with Owner Approval
    if (cmd === 'reset') {
      if (!serverConfig.has(guildId)) {
        return interaction.reply({ embeds: [redEmbed('ℹ️ Nothing to Reset', 'No settings have been configured for this server.')] });
      }

      if (pendingResetRequests.has(guildId)) {
        return interaction.reply({ embeds: [redEmbed('⏳ Waiting for Approval', 'Request already sent to owner. Please wait for their confirmation.')] });
      }

      const owner = await guild.fetchOwner().catch(() => null);
      if (!owner) {
        return interaction.reply({ embeds: [redEmbed('❌ Error', 'Could not find or contact the server owner.')] });
      }

      pendingResetRequests.set(guildId, {
        requestedBy: member.user.tag,
        requestedById: member.id,
        guildName: guild.name
      });

      try {
        await owner.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFAA00')
              .setTitle('⚠️ Reset Request')
              .setDescription(`**Server:** ${guild.name}\n**Requested by:** ${member.user.tag}\n\nThis user wants to RESET ALL PROTECTION SETTINGS.\n\nDo you allow this action?\n\nReply with **YES** to confirm or **NO** to cancel.`)
              .setTimestamp()
          ]
        });
      } catch {
        pendingResetRequests.delete(guildId);
        return interaction.reply({ embeds: [redEmbed('❌ Could Not DM Owner', 'The owner has DMs disabled. Ask them to open DMs first.')] });
      }

      return interaction.reply({ embeds: [redEmbed('📩 Request Sent', 'Reset request has been sent to the server owner. Please wait for their approval.')] });
    }

    if (!serverConfig.has(guildId)) {
      return interaction.reply({ embeds: [redEmbed('⚠️ Not Configured', 'Please run `/setup` first to activate features.')], flags: 64 });
    }

    const config = serverConfig.get(guildId);

    if (cmd === 'antispam') {
      config.antiSpam = !config.antiSpam;
      serverConfig.set(guildId, config);
      return interaction.reply({ embeds: [redEmbed('✅ Anti-Spam Updated', `Anti-Spam is now: **${config.antiSpam ? 'ENABLED ✅' : 'DISABLED ❌'}**`)] });
    }

    if (cmd === 'antilink') {
      config.antiLink = !config.antiLink;
      serverConfig.set(guildId, config);
      return interaction.reply({ embeds: [redEmbed('✅ Anti-Link Updated', `Anti-Link is now: **${config.antiLink ? 'ENABLED ✅' : 'DISABLED ❌'}**`)] });
    }

    if (cmd === 'whitelist') {
      const sub = interaction.options.getSubcommand();
      const role = interaction.options.getRole('role');

      if (sub === 'list') {
        const list = config.whitelistRoles.length > 0
          ? config.whitelistRoles.map(id => `<@&${id}>`).join('\n')
          : 'No roles added yet.';
        return interaction.reply({ embeds: [redEmbed('📋 Whitelisted Roles', list)] });
      }

      if (sub === 'add') {
        if (config.whitelistRoles.includes(role.id)) {
          return interaction.reply({ embeds: [redEmbed('ℹ️ Already Added', 'This role is already in the whitelist.')] });
        }
        config.whitelistRoles.push(role.id);
        serverConfig.set(guildId, config);
        return interaction.reply({ embeds: [redEmbed('✅ Role Added', `**${role.name}** has been added to the whitelist.`)] });
      }

      if (sub === 'remove') {
        config.whitelistRoles = config.whitelistRoles.filter(id => id !== role.id);
        serverConfig.set(guildId, config);
        return interaction.reply({ embeds: [redEmbed('✅ Role Removed', `**${role.name}** has been removed from the whitelist.`)] });
      }
    }

    if (['profile', 'avatar', 'serverinfo'].includes(cmd)) {
      const result = await info.handleInfoSlash(interaction);
      return interaction.reply(result);
    }

  } catch (err) {
    console.error('❌ Command error:', err);
    if (!interaction.replied && !interaction.deferred) {
      return interaction.reply({ content: '⚠️ An error occurred.', flags: 64 }).catch(() => {});
    }
  }
});

// 📌 Handle DM responses from Owner
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.guild) {
    const response = message.content.trim().toUpperCase();
    let foundRequest = null;
    let guildIdFound = null;

    for (const [gId, reqData] of pendingResetRequests) {
      const guild = client.guilds.cache.get(gId);
      if (guild && guild.ownerId === message.author.id) {
        foundRequest = reqData;
        guildIdFound = gId;
        break;
      }
    }

    if (!foundRequest) return;

    if (response === 'YES' || response === 'ACCEPT') {
      serverConfig.delete(guildIdFound);
      for (const [userId, logs] of userMessageCache) {
        if (logs.guildId === guildIdFound) userMessageCache.delete(userId);
      }
      pendingResetRequests.delete(guildIdFound);

      await message.author.send({ embeds: [redEmbed('✅ Reset Confirmed', 'All protection settings have been successfully reset.')] }).catch(() => {});
      const requester = client.guilds.cache.get(guildIdFound)?.members.cache.get(foundRequest.requestedById);
      if (requester) requester.send({ embeds: [redEmbed('✅ Owner Approved', 'Reset request has been approved. All settings are now cleared.')] }).catch(() => {});
    }

    else if (response === 'NO' || response === 'DENY') {
      pendingResetRequests.delete(guildIdFound);
      await message.author.send({ embeds: [redEmbed('❌ Reset Cancelled', 'You have denied the reset request. No changes were made.')] }).catch(() => {});
      const requester = client.guilds.cache.get(guildIdFound)?.members.cache.get(foundRequest.requestedById);
      if (requester) requester.send({ embeds: [redEmbed('❌ Owner Rejected', 'Your reset request was denied by the server owner.')] }).catch(() => {});
    }

    return;
  }

  // 🛡️ ULTRA FAST ANTI-SPAM
  const guildId = message.guild.id;
  const userId = message.author.id;
  if (!serverConfig.has(guildId)) return;

  const config = serverConfig.get(guildId);
  const member = message.member;
  const isWhitelisted = member.roles.cache.some(role => config.whitelistRoles.includes(role.id));
  if (isWhitelisted) return;

  // 🚫 Anti-Link
  if (config.antiLink) {
    const linkRegex = /discord\.gg\/|discord\.com\/invite\//gi;
    if (linkRegex.test(message.content)) {
      await message.delete().catch(() => {});
      return message.channel.send({ embeds: [redEmbed('❌ Link Detected', 'LUHOD GAGO HUWAG KA MAG SEND NG LINK.')] }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
    }
  }

  // 🚫 Anti-Spam - FASTEST MODE
  if (config.antiSpam) {
    const now = Date.now();
    const cleanText = message.content.trim().toLowerCase();
    if (!cleanText) return;

    if (!userMessageCache.has(userId)) {
      userMessageCache.set(userId, {
        messages: [],
        triggered: false,
        lastReset: 0
      });
    }

    const userLog = userMessageCache.get(userId);
    userLog.messages = userLog.messages.filter(item => now - item.time < config.timeLimit);
    userLog.messages.push({ text: cleanText, time: now });

    const sameCount = userLog.messages.filter(item => item.text === cleanText).length;

    if (userLog.triggered) {
      await message.delete().catch(() => {});
      if (now - userLog.lastReset > config.resetCooldown) {
        userLog.triggered = false;
        userLog.messages = [];
      }
      return;
    }

    if (sameCount >= config.maxSameMessages) {
      userLog.triggered = true;
      userLog.lastReset = now;
      await message.delete().catch(() => {});

      const warning = await message.channel.send({
        embeds: [redEmbed('⚠️ SPAM DETECTED', 'LUHOD GAGO, HUWAG KA MAG SPAM KUTONG LUPA')]
      }).catch(() => {});

      if (warning) setTimeout(() => warning.delete().catch(() => {}), 4000);
    }
  }
});

client.login(BOT_TOKEN);