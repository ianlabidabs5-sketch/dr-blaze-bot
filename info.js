const { EmbedBuilder } = require('discord.js');

function redEmbed(title, description = null) {
  const embed = new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setTimestamp()
    .setFooter({ text: 'Dr.Blaze | Information' });

  if (description) embed.setDescription(description);
  return embed;
}

module.exports = {
  async handleInfoSlash(interaction) {
    const cmd = interaction.commandName;

    if (cmd === 'profile') {
      const target = interaction.options.getUser('user') || interaction.user;
      const member = interaction.guild.members.cache.get(target.id);

      const embed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle(`👤 PROFILE: ${target.tag}`)
        .setThumbnail(target.displayAvatarURL({ size: 512, dynamic: true }))
        .addFields(
          { name: '🆔 User ID', value: target.id, inline: true },
          { name: '📅 Account Created', value: `<t:${Math.floor(target.createdTimestamp / 1000)}:F>`, inline: false },
          { name: '🚪 Joined Server', value: member ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Not available', inline: false }
        )
        .setTimestamp()
        .setFooter({ text: 'Dr.Blaze | Information' });

      return { embeds: [embed] };
    }

    if (cmd === 'avatar') {
      const user = interaction.options.getUser('user') || interaction.user;
      const embed = redEmbed('🖼️ USER AVATAR')
        .setImage(user.displayAvatarURL({ size: 4096, dynamic: true }));
      return { embeds: [embed] };
    }

    if (cmd === 'serverinfo') {
      const guild = interaction.guild;
      return { embeds: [redEmbed('🏠 SERVER INFORMATION',
        `**Name:** ${guild.name}\n` +
        `**Owner:** <@${guild.ownerId}>\n` +
        `**Created:** <t:${Math.floor(guild.createdTimestamp / 1000)}:F>\n` +
        `**Total Members:** ${guild.memberCount}`)] };
    }
  }
};