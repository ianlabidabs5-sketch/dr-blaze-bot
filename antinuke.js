const { EmbedBuilder, PermissionsBitField } = require('discord.js');

// 📌 Storage for settings, logs, and pending requests
const serverConfig = new Map();
const userMessageCache = new Map();
const pendingSetupRequests = new Map(); // Tracks pending setup approvals

// ✅ Embed template
function redEmbed(title, description = null) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Dr.Blaze | Protection System' });

  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  // 📌 Handle slash commands
  async handleAntiNukeSlash(interaction) {
    const guildId = interaction.guild.id;
    const guild = interaction.guild;
    const member = interaction.member;
    const cmd = interaction.commandName;

    const hasPermission = member.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
                           member.permissions.has(PermissionsBitField.Flags.Administrator);

    if (!hasPermission) {
      return { embeds: [redEmbed('❌ Access Denied', 'You need **Manage Server** or **Administrator** permission to use this command.')], flags: 64 };
    }

    if (cmd === 'reset') {
      if (!serverConfig.has(guildId)) {
        return { embeds: [redEmbed('ℹ️ Nothing to Reset', 'No settings have been configured for this server.')] };
      }
      serverConfig.delete(guildId);
      pendingSetupRequests.delete(guildId);
      for (const [userId, logs] of userMessageCache) {
        if (logs.guildId === guildId) userMessageCache.delete(userId);
      }
      return { embeds: [redEmbed('✅ System Reset', 'All settings and pending requests have been cleared.\n\nTo use protection again, run: `/setup`')] };
    }

    if (cmd === 'setup') {
      // If already set up
      if (serverConfig.has(guildId)) {
        return { embeds: [redEmbed('⚠️ Already Configured', 'This server has already been set up.')] };
      }

      // If already waiting for approval
      if (pendingSetupRequests.has(guildId)) {
        return { embeds: [redEmbed('⏳ Pending Approval', 'A setup request has already been sent to the server owner. Please wait for confirmation.')] };
      }

      // Get server owner
      const owner = await guild.fetchOwner().catch(() => null);
      if (!owner) {
        return { embeds: [redEmbed('❌ Error', 'Could not find or contact the server owner.')] };
      }

      // Save request info
      pendingSetupRequests.set(guildId, {
        requestedBy: member.user.tag,
        requestedById: member.id,
        guildName: guild.name,
        timestamp: Date.now()
      });

      // Send DM to owner in ENGLISH
      try {
        await owner.send({
          embeds: [
            new EmbedBuilder()
              .setColor('#FFAA00')
              .setTitle('⚠️ Anti-Nuke Setup Request')
              .setDescription(`**Server:** ${guild.name}\n**Requested by:** ${member.user.tag}\n\nDo you want to allow this user to enable the Anti-Nuke protection system?\n\nReply with **YES** to approve or **NO** to deny.`)
              .setTimestamp()
          ]
        });
      } catch {
        pendingSetupRequests.delete(guildId);
        return { embeds: [redEmbed('❌ Could Not DM Owner', 'The server owner has DMs disabled. Please ask them to open DMs first.')] };
      }

      return { embeds: [redEmbed('📩 Request Sent', 'Setup request has been sent to the server owner. Please wait for approval.')] };
    }

    if (!serverConfig.has(guildId)) {
      return { embeds: [redEmbed('⚠️ Not Configured', 'Please run `/setup` first to activate features.')], flags: 64 };
    }

    const config = serverConfig.get(guildId);

    if (cmd === 'antispam') {
      config.antiSpam = !config.antiSpam;
      serverConfig.set(guildId, config);
      return { embeds: [redEmbed('✅ Anti-Spam Updated', `Anti-Spam is now: **${config.antiSpam ? 'ENABLED ✅' : 'DISABLED ❌'}**`)] };
    }

    if (cmd === 'antilink') {
      config.antiLink = !config.antiLink;
      serverConfig.set(guildId, config);
      return { embeds: [redEmbed('✅ Anti-Link Updated', `Anti-Link is now: **${config.antiLink ? 'ENABLED ✅' : 'DISABLED ❌'}**`)] };
    }

    if (cmd === 'whitelist') {
      const sub = interaction.options.getSubcommand();
      const role = interaction.options.getRole('role');

      if (sub === 'list') {
        const roleList = config.whitelistRoles.length > 0
          ? config.whitelistRoles.map(id => `<@&${id}>`).join('\n')
          : 'No roles added yet.';
        return { embeds: [redEmbed('📋 Whitelisted Roles', roleList)] };
      }

      if (sub === 'add') {
        if (config.whitelistRoles.includes(role.id)) {
          return { embeds: [redEmbed('ℹ️ Already Added', 'This role is already in the whitelist.')] };
        }
        config.whitelistRoles.push(role.id);
        serverConfig.set(guildId, config);
        return { embeds: [redEmbed('✅ Role Added', `**${role.name}** has been added to the whitelist.`)] };
      }

      if (sub === 'remove') {
        config.whitelistRoles = config.whitelistRoles.filter(id => id !== role.id);
        serverConfig.set(guildId, config);
        return { embeds: [redEmbed('✅ Role Removed', `**${role.name}** has been removed from the whitelist.`)] };
      }
    }
  },

  // 📌 Handle owner replies in DMs
  async handleOwnerDM(message, client) {
    if (message.guild || message.author.bot) return;

    const response = message.content.trim().toUpperCase();
    let foundRequest = null;
    let guildIdFound = null;

    // Look for pending request from this owner
    for (const [guildId, data] of pendingSetupRequests) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;

      const ownerId = guild.ownerId;
      if (ownerId === message.author.id) {
        foundRequest = data;
        guildIdFound = guildId;
        break;
      }
    }

    if (!foundRequest) return;

    // Approve setup
    if (response === 'YES' || response === 'ACCEPT') {
      // Set up the server
      serverConfig.set(guildIdFound, {
        antiSpam: true,
        antiLink: true,
        whitelistRoles: [],
        maxSameMessages: 3,
        timeLimit: 4000
      });

      pendingSetupRequests.delete(guildIdFound);

      // Notify owner
      await message.author.send({
        embeds: [redEmbed('✅ Request Approved', 'Anti-Nuke system has been enabled. The user who requested setup can now use `/setup` successfully.')]
      }).catch(() => {});

      // Notify the requester in the server
      const guild = client.guilds.cache.get(guildIdFound);
      if (guild) {
        const requester = guild.members.cache.get(foundRequest.requestedById);
        if (requester) {
          requester.send({
            embeds: [redEmbed('✅ Owner Accepted', 'The server owner has approved your request. Please run `/setup` again to finish configuration.')]
          }).catch(() => {});
        }
      }
    }

    // Deny setup
    else if (response === 'NO' || response === 'DENY') {
      pendingSetupRequests.delete(guildIdFound);

      await message.author.send({
        embeds: [redEmbed('❌ Request Denied', 'You have rejected the setup request. No changes were made.')]
      }).catch(() => {});

      const guild = client.guilds.cache.get(guildIdFound);
      if (guild) {
        const requester = guild.members.cache.get(foundRequest.requestedById);
        if (requester) {
          requester.send({
            embeds: [redEmbed('❌ Owner Rejected', 'The server owner has denied your setup request.')]
          }).catch(() => {});
        }
      }
    }
  },

  // 🛡️ Protection logic
  async runProtection(message) {
    if (message.author.bot || !message.guild) return;

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
        return message.channel.send({
          embeds: [redEmbed('❌ Link Detected', 'Sending invite links is not allowed here.')]
        }).then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
      }
    }

    // 🚫 Anti-Spam
    if (config.antiSpam) {
      const now = Date.now();
      const cleanText = message.content.trim().toLowerCase();
      if (!cleanText) return;

      if (!userMessageCache.has(userId)) {
        userMessageCache.set(userId, { guildId: guildId, messages: [], triggered: false });
      }

      const userLog = userMessageCache.get(userId);
      userLog.messages = userLog.messages.filter(item => now - item.time < config.timeLimit);
      userLog.messages.push({ text: cleanText, time: now });

      const sameCount = userLog.messages.filter(item => item.text === cleanText).length;

      if (userLog.triggered) {
        await message.delete().catch(() => {});
        return;
      }

      if (sameCount >= config.maxSameMessages) {
        userLog.triggered = true;
        await message.delete().catch(() => {});

        const warningMsg = await message.channel.send({
          embeds: [redEmbed('⚠️ SPAM DETECTED', 'LUHOD GAGO, HUWAG KA MAG SPAM KUTONG LUPA')]
        }).catch(() => {});

        if (warningMsg) setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

        setTimeout(() => {
          if (userMessageCache.has(userId)) {
            const currentLog = userMessageCache.get(userId);
            currentLog.triggered = false;
            currentLog.messages = [];
          }
        }, 3000);
      }
    }
  }
};