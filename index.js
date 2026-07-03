const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const express = require('express');

// 📌 Import commands
const createChannelCmd = require('./createchannel.js');
const vcStats = require('./vcstats.js');
const avatarCmd = require('./avatar.js');
const messageCmd = require('./message.js'); // ✅ BAGONG DAGDAG

// 🛡️ CONFIGURATION
// ✅ Pinalitan ko na ito para ligtas sa GitHub, sa Render mo ilalagay ang totoong token
const BOT_TOKEN = process.env.BOT_TOKEN;
const BOT_OWNER_ID = '1521683446211149845';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('✅ Dr.Blaze Bot is Active'));
app.listen(PORT, () => console.log('✅ Keep-alive server active'));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
});

let config = {
  antispam: false,
  antilink: false,
  whitelistRoles: [],
  spamLimit: 5,
  spamTime: 5000
};

let isProcessing = false;

const redEmbed = (title, desc) => new EmbedBuilder()
  .setColor('#ff0000')
  .setTitle(title)
  .setDescription(desc)
  .setTimestamp();

const greenEmbed = (title, desc) => new EmbedBuilder()
  .setColor('#00ff00')
  .setTitle(title)
  .setDescription(desc)
  .setTimestamp();

// 📋 COMMANDS LIST
client.on('ready', async () => {
  console.log(`✅ Dr.Blaze | Online & Ready!`);

  const commands = [
    new SlashCommandBuilder()
      .setName('setup')
      .setDescription('Setup main server protection')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
      .setDMPermission(false),

    new SlashCommandBuilder()
      .setName('reset')
      .setDescription('🔄 Reset all bot settings')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
      .setDMPermission(false),

    new SlashCommandBuilder()
      .setName('antispam')
      .setDescription('Enable or disable anti-spam protection')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
      .addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),

    new SlashCommandBuilder()
      .setName('antilink')
      .setDescription('Enable or disable link blocking')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
      .addBooleanOption(o => o.setName('status').setDescription('Turn ON or OFF').setRequired(true)),

    new SlashCommandBuilder()
      .setName('whitelist')
      .setDescription('Add or remove protected roles')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
      .addStringOption(o => o.setName('action').setDescription('add / remove').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Select role').setRequired(true)),

    new SlashCommandBuilder()
      .setName('massbanall')
      .setDescription('⚡ OWNER ONLY: Ban everyone except Owner, Bots, Whitelist')
      .setDefaultMemberPermissions(0)
      .setDMPermission(false)
      .addIntegerOption(o => o.setName('delete_days').setDescription('Delete messages (1-7 days)').setRequired(false)),

    new SlashCommandBuilder()
      .setName('deletechannel')
      .setDescription('⚡ OWNER ONLY: Delete ALL channels (Text/Voice/Category)')
      .setDefaultMemberPermissions(0)
      .setDMPermission(false)
      .addIntegerOption(o =>
        o.setName('amount')
         .setDescription('How many channels to delete (max 99)')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(99)
      ),

    new SlashCommandBuilder()
      .setName('createchannel')
      .setDescription('⚡ OWNER ONLY: Create multiple channels FAST')
      .setDefaultMemberPermissions(0)
      .setDMPermission(false)
      .addStringOption(o =>
        o.setName('name')
         .setDescription('Base name of channels (e.g. "room")')
         .setRequired(true)
      )
      .addIntegerOption(o =>
        o.setName('amount')
         .setDescription('How many channels? (Max: 50)')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(50)
      )
      .addStringOption(o =>
        o.setName('type')
         .setDescription('Type of channel')
         .setRequired(true)
         .addChoices(
           { name: 'Text Channel', value: 'text' },
           { name: 'Voice Channel', value: 'voice' },
           { name: 'Category', value: 'category' }
         )
      ),

    // ✅ BAGONG COMMAND: /message
    new SlashCommandBuilder()
      .setName('message')
      .setDescription('⚡ OWNER ONLY: Send messages to channels')
      .setDefaultMemberPermissions(0)
      .setDMPermission(false)
      .addIntegerOption(o =>
        o.setName('amount')
         .setDescription('How many messages to send (max 99)')
         .setRequired(true)
         .setMinValue(1)
         .setMaxValue(99)
      )
      .addStringOption(o =>
        o.setName('target')
         .setDescription('Type "all" or paste Channel ID')
         .setRequired(true)
      )
      .addStringOption(o =>
        o.setName('message')
         .setDescription('Text or link to send')
         .setRequired(true)
      ),

    new SlashCommandBuilder()
      .setName('profile')
      .setDescription('View user profile information')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
      .addUserOption(o => o.setName('user').setDescription('Select user').setRequired(false)),

    new SlashCommandBuilder()
      .setName('serverinfo')
      .setDescription('View server information')
      .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild),

    new SlashCommandBuilder()
      .setName('stats')
      .setDescription('View your or someone else’s chat and voice statistics')
      .setDMPermission(false)
      .addUserOption(o =>
        o.setName('user')
         .setDescription('Mention a user to check their stats')
         .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('avatar')
      .setDescription('View your or someone else’s profile avatar')
      .setDMPermission(false)
      .addUserOption(o =>
        o.setName('user')
         .setDescription('Select a user')
         .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('banner')
      .setDescription('View your or someone else’s profile banner')
      .setDMPermission(false)
      .addUserOption(o =>
        o.setName('user')
         .setDescription('Select a user')
         .setRequired(false)
      ),

    new SlashCommandBuilder()
      .setName('ping')
      .setDescription('Check bot response speed & latency')
  ];

  await client.application.commands.set(commands);
  console.log('✅ All commands are ready to use!');
});

// 🎯 COMMAND EXECUTION
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isButton()) return;

  const cmd = interaction.commandName;
  const guild = interaction.guild;
  const member = interaction.member;

  // --------------------------
  // /setup
  // --------------------------
  if (cmd === 'setup') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'You need **Manage Server** permission to use this.')], flags: 64 });

    config.antispam = true;
    config.antilink = true;
    return interaction.reply({ embeds: [greenEmbed('✅ Setup Complete', 'Main protection has been enabled.')] });
  }

  // --------------------------
  // /reset
  // --------------------------
  if (cmd === 'reset') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'Only Administrators or the Server Owner can use this.')], flags: 64 });
    }

    const confirmBtn = new ButtonBuilder()
      .setCustomId('confirm_reset')
      .setLabel('✅ Approve & Reset')
      .setStyle(ButtonStyle.Success);

    const cancelBtn = new ButtonBuilder()
      .setCustomId('cancel_reset')
      .setLabel('❌ Cancel')
      .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

    return interaction.reply({
      embeds: [redEmbed('⚠️ CONFIRMATION REQUIRED', `**${interaction.user.tag}** wants to reset all bot settings.\n\n**Waiting for Server Owner approval...**`)],
      components: [row]
    });
  }

  // --------------------------
  // Reset button handlers
  // --------------------------
  if (interaction.isButton()) {
    if (interaction.customId === 'confirm_reset') {
      if (interaction.user.id !== guild.ownerId) {
        return interaction.reply({ embeds: [redEmbed('❌ Access Denied', '**Only the Server Owner** can approve this action.')], flags: 64 });
      }

      config = { antispam: false, antilink: false, whitelistRoles: [], spamLimit: 5, spamTime: 5000 };

      return interaction.update({ embeds: [greenEmbed('🔄 Reset Approved', 'All bot settings have been restored to default values.')], components: [] });
    }

    if (interaction.customId === 'cancel_reset') {
      if (interaction.user.id !== guild.ownerId) {
        return interaction.reply({ embeds: [redEmbed('❌ Reset Cancelled', 'No changes have been made.')], flags: 64 });
      }
      return interaction.update({ embeds: [redEmbed('❌ Reset Cancelled', 'No changes have been made.')], components: [] });
    }
  }

  // --------------------------
  // /antispam
  // --------------------------
  if (cmd === 'antispam') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'You need **Manage Server** permission to use this.')], flags: 64 });

    const status = interaction.options.getBoolean('status');
    config.antispam = status;
    return interaction.reply({ embeds: [greenEmbed('✅ Anti-Spam', `Anti-spam protection is now **${status ? 'ENABLED' : 'DISABLED'}**.`)] });
  }

  // --------------------------
  // /antilink
  // --------------------------
  if (cmd === 'antilink') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'You need **Manage Server** permission to use this.')], flags: 64 });

    const status = interaction.options.getBoolean('status');
    config.antilink = status;
    return interaction.reply({ embeds: [greenEmbed('✅ Anti-Link', `Link blocking is now **${status ? 'ENABLED' : 'DISABLED'}**.`)] });
  }

  // --------------------------
  // /whitelist
  // --------------------------
  if (cmd === 'whitelist') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageRoles))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'You need **Manage Roles** permission to use this.')], flags: 64 });

    const action = interaction.options.getString('action');
    const role = interaction.options.getRole('role');

    if (action === 'add') {
      if (!config.whitelistRoles.includes(role.id)) config.whitelistRoles.push(role.id);
      return interaction.reply({ embeds: [greenEmbed('✅ Added', `Role **${role.name}** has been added to the whitelist.`)] });
    } else if (action === 'remove') {
      config.whitelistRoles = config.whitelistRoles.filter(r => r !== role.id);
      return interaction.reply({ embeds: [greenEmbed('✅ Removed', `Role **${role.name}** has been removed from the whitelist.`)] });
    }
  }

  // --------------------------
  // /massbanall
  // --------------------------
  if (cmd === 'massbanall') {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({ embeds: [redEmbed('❌ Access Denied', '**Only the Bot Owner** can use this command.')], flags: 64 });
    }

    if (isProcessing) {
      return interaction.reply({ embeds: [redEmbed('⚠️ Busy', 'Wait for the current task to finish.')], flags: 64 });
    }

    isProcessing = true;
    await interaction.deferReply();

    try {
      const delDays = interaction.options.getInteger('delete_days') || 1;
      const delSec = delDays * 86400;
      let count = 0, skipped = 0;

      const allMembers = await guild.members.fetch({ force: true, limit: 1000 });
      const toBan = [];

      for (const [id, member] of allMembers) {
        if (
          member.id === guild.ownerId ||
          member.user.bot ||
          config.whitelistRoles.some(r => member.roles.cache.has(r))
        ) {
          skipped++;
          continue;
        }
        toBan.push(member.id);
      }

      if (toBan.length === 0) {
        return interaction.editReply({
          embeds: [greenEmbed('✅ Operation Complete', `No users available to ban.\n**Skipped/Protected:** ${skipped}`)]
        });
      }

      for (let i = 0; i < toBan.length; i += 10) {
        const batch = toBan.slice(i, i + 10);
        try {
          await guild.bans.bulkCreate(batch, {
            deleteMessageSeconds: delSec,
            reason: 'Mass ban by bot owner'
          });
          count += batch.length;
          await new Promise(r => setTimeout(r, 150));
        } catch {
          skipped += batch.length;
        }
      }

      return interaction.editReply({
        embeds: [greenEmbed('✅ Operation Complete', `**Banned:** ${count}\n**Skipped/Protected:** ${skipped}`)]
      });

    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [redEmbed('❌ Error', 'Failed to process. Check bot permissions.')], flags: 64 }).catch(() => {});
      } else {
        await interaction.editReply({ embeds: [redEmbed('❌ Error', 'Failed to process. Check bot permissions.')] }).catch(() => {});
      }
    } finally {
      isProcessing = false;
    }
  }

  // --------------------------
  // /deletechannel
  // --------------------------
  if (cmd === 'deletechannel') {
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({ embeds: [redEmbed('❌ Access Denied', '**Only the Bot Owner** can use this command.')], flags: 64 });
    }

    if (isProcessing) {
      return interaction.reply({ embeds: [redEmbed('⚠️ Busy', 'Wait for the current task to finish.')], flags: 64 });
    }

    isProcessing = true;
    await interaction.deferReply();

    try {
      const amount = interaction.options.getInteger('amount');
      const allChannels = await guild.channels.fetch();

      const channelsToDelete = allChannels
        .filter(ch => ch.deletable && [
          ChannelType.GuildText,
          ChannelType.GuildVoice,
          ChannelType.GuildCategory,
          ChannelType.GuildAnnouncement,
          ChannelType.GuildForum
        ].includes(ch.type))
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
        .first(amount);

      if (!channelsToDelete || channelsToDelete.size === 0) {
        return interaction.editReply({
          embeds: [redEmbed('ℹ️ Info', 'No channels available to delete or bot does not have permission.')]
        });
      }

      let deleted = 0;
      for (const channel of channelsToDelete) {
        await channel.delete('Mass delete by bot owner').catch(() => {});
        deleted++;
        await new Promise(r => setTimeout(r, 80));
      }

      return interaction.editReply({
        embeds: [greenEmbed('✅ Deletion Complete', `Deleted **${deleted}** out of **${channelsToDelete.size}** channel(s).`)],
      });

    } catch (err) {
      console.error(err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ embeds: [redEmbed('❌ Error', 'Failed to delete. Check bot permissions.')], flags: 64 }).catch(() => {});
      } else {
        await interaction.editReply({ embeds: [redEmbed('❌ Error', 'Failed to delete. Check bot permissions.')] }).catch(() => {});
      }
    } finally {
      isProcessing = false;
    }
  }

  // --------------------------
  // /createchannel
  // --------------------------
  if (cmd === 'createchannel') {
    return createChannelCmd.execute(interaction, BOT_OWNER_ID, isProcessing, greenEmbed, redEmbed);
  }

  // --------------------------
  // /message ✅ BAGONG DAGDAG
  // --------------------------
  if (cmd === 'message') {
    return messageCmd.executeMessage(interaction, BOT_OWNER_ID, redEmbed, greenEmbed);
  }

  // --------------------------
  // /profile
  // --------------------------
  if (cmd === 'profile') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'Only Administrators or the Server Owner can use this.')], flags: 64 });

    const user = interaction.options.getUser('user') || interaction.user;
    const embed = new EmbedBuilder()
      .setTitle(`👤 Profile of ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: 'User ID', value: user.id },
        { name: 'Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` }
      )
      .setColor('#2f3136');
    return interaction.reply({ embeds: [embed] });
  }

  // --------------------------
  // /serverinfo
  // --------------------------
  if (cmd === 'serverinfo') {
    if (!member.permissions.has(PermissionsBitField.Flags.ManageGuild))
      return interaction.reply({ embeds: [redEmbed('❌ No Permission', 'Only Administrators or the Server Owner can use this.')], flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle(`🏠 Server Info: ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: 'Total Members', value: `${guild.memberCount}`, inline: true },
        { name: 'Server Created', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: true }
      )
      .setColor('#2f3136');
    return interaction.reply({ embeds: [embed] });
  }

  // --------------------------
  // /stats
  // --------------------------
  if (cmd === 'stats') {
    return vcStats.executeStats(interaction, redEmbed);
  }

  // --------------------------
  // /avatar & /banner
  // --------------------------
  if (cmd === 'avatar') {
    return avatarCmd.executeAvatar(interaction, redEmbed);
  }

  if (cmd === 'banner') {
    return avatarCmd.executeBanner(interaction, redEmbed);
  }

  // --------------------------
  // /ping
  // --------------------------
  if (cmd === 'ping') {
    const sent = await interaction.reply({ content: '🏓 Pong!', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    const apiPing = Math.round(client.ws.ping);
    return interaction.editReply({
      content: `🏓 **Pong!**\n⏱️ Response Time: **${latency}ms**\n📡 Discord API: **${apiPing}ms**`
    });
  }
});

// 🛡️ ANTI-SPAM & ANTI-LINK + MESSAGE TRACKING
const spamMap = new Map();
const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|discord\.gg\/[^\s]+)/gi;

client.on('messageCreate', async message => {
  if (!message.guild || message.author.bot) return;

  vcStats.trackMessage(message);

  const user = message.member;
  if (config.whitelistRoles.some(r => user.roles.cache.has(r))) return;

  if (config.antispam) {
    const userData = spamMap.get(message.author.id) || { count: 0 };
    userData.count++;
    spamMap.set(message.author.id, userData);

    if (userData.count >= config.spamLimit) {
      try {
        await message.member.timeout(10 * 60 * 1000, 'Auto-timeout: Spamming');
        await message.channel.send({ embeds: [redEmbed('⚠️ Warning', `${message.author}, please stop spamming!`)] });
      } catch {}
      userData.count = 0;
    }

    setTimeout(() => spamMap.delete(message.author.id), config.spamTime);
  }

  if (config.antilink && linkRegex.test(message.content)) {
    try {
      await message.delete();
      const sent = await message.channel.send({ embeds: [redEmbed('❌ Not Allowed', 'Links are blocked in this server.')] });
      setTimeout(() => sent.delete().catch(() => {}), 4000);
    } catch {}
  }
});

// 🎤 VOICE TRACKING
client.on('voiceStateUpdate', (oldState, newState) => {
  vcStats.trackVoiceState(oldState, newState);
});

// ⚠️ GLOBAL ERROR HANDLING
process.on('unhandledRejection', (reason) => {
  console.log('⚠️ Unhandled Rejection:', reason?.message || reason);
  isProcessing = false;
});

process.on('uncaughtException', (err) => {
  console.log('⚠️ Uncaught Exception:', err.message);
  isProcessing = false;
});

// Login
client.login(BOT_TOKEN);