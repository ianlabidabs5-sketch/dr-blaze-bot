const { EmbedBuilder } = require('discord.js');

module.exports = {
  executeAvatar: async (interaction, redEmbed) => {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const avatarURL = targetUser.displayAvatarURL({ dynamic: true, size: 4096 });

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`🖼️ Avatar of ${targetUser.tag}`)
        .setImage(avatarURL)
        .setDescription(`[Open Original](${avatarURL})`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Avatar error:', err);
      return interaction.reply({ embeds: [redEmbed('❌ Error', 'Failed to fetch avatar.')], flags: 64 });
    }
  },

  executeBanner: async (interaction, redEmbed) => {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const fetchedUser = await targetUser.fetch();
      const bannerURL = fetchedUser.bannerURL({ dynamic: true, size: 4096 });

      if (!bannerURL) {
        return interaction.reply({ embeds: [redEmbed('ℹ️ No Banner', `${targetUser.tag} does not have a banner set.`)], flags: 64 });
      }

      const embed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`🎨 Banner of ${targetUser.tag}`)
        .setImage(bannerURL)
        .setDescription(`[Open Original](${bannerURL})`)
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    } catch (err) {
      console.error('Banner error:', err);
      return interaction.reply({ embeds: [redEmbed('❌ Error', 'Failed to fetch banner.')], flags: 64 });
    }
  }
};