const { EmbedBuilder, PermissionsBitField } = require('discord.js');

module.exports = {
  executeMessage: async (interaction, BOT_OWNER_ID, redEmbed, greenEmbed) => {
    // Pwede lang sa may-ari ng bot
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        embeds: [redEmbed('❌ Access Denied', 'Only the Bot Owner can use this command.')],
        flags: 64
      });
    }

    await interaction.deferReply({ flags: 64 });

    try {
      const amount = interaction.options.getInteger('amount');
      const target = interaction.options.getString('target');
      const content = interaction.options.getString('message');

      // Kuhanin lahat ng text channels kung "all" ang pinili
      let channels = [];
      if (target === 'all') {
        channels = interaction.guild.channels.cache.filter(
          ch => ch.isTextBased() && ch.viewable && ch.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)
        );
        if (channels.size === 0) {
          return interaction.editReply({ embeds: [redEmbed('❌ Error', 'No accessible text channels found.')] });
        }
      } else {
        const channel = interaction.guild.channels.cache.get(target);
        if (!channel || !channel.isTextBased() || !channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
          return interaction.editReply({ embeds: [redEmbed('❌ Error', 'Invalid or no permission to use that channel.')] });
        }
        channels = [channel];
      }

      const channelList = Array.from(channels.values());
      const delay = 300; // 0.3 segundo bawat mensahe

      // Sabay-sabay na pagpapadala, walang mahabang antayan
      const sendPromises = channelList.map(async (ch) => {
        for (let i = 0; i < amount; i++) {
          try {
            await ch.send({ content: content });
            // Maliit na hinto lang para hindi ma-block ng Discord
            await new Promise(resolve => setTimeout(resolve, delay));
          } catch (err) {
            console.log(`⚠️ Failed to send in ${ch.name}:`, err.message);
          }
        }
      });

      // Hintayin matapos lahat
      await Promise.allSettled(sendPromises);

      return interaction.editReply({
        embeds: [greenEmbed('✅ Complete', `Sent **${amount} message(s)** in **${channelList.length} channel(s)**.`)],
      });

    } catch (err) {
      console.error('Message command error:', err);
      return interaction.editReply({
        embeds: [redEmbed('❌ Error', 'Something went wrong while sending messages.')]
      });
    }
  }
};