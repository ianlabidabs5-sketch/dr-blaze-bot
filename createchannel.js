const { ChannelType } = require('discord.js');

module.exports = {
  execute: async (interaction, BOT_OWNER_ID, isProcessing, greenEmbed, redEmbed) => {

    // 🛡️ Check: Owner lang
    if (interaction.user.id !== BOT_OWNER_ID) {
      return interaction.reply({
        embeds: [redEmbed('❌ Access Denied', '**Only the Bot Owner** can use this command.')],
        ephemeral: true
      }).catch(() => {});
    }

    // ⏳ Check: May tumatakbo ba?
    if (isProcessing) {
      return interaction.reply({
        embeds: [redEmbed('⚠️ Busy', 'Wait for the current process to finish first.')],
        ephemeral: true
      }).catch(() => {});
    }

    isProcessing = true;

    try {
      await interaction.deferReply({ ephemeral: false }).catch(() => {});

      const baseName = interaction.options.getString('name');
      const amount = interaction.options.getInteger('amount');
      const type = interaction.options.getString('type');

      let channelType;
      switch (type) {
        case 'text': channelType = ChannelType.GuildText; break;
        case 'voice': channelType = ChannelType.GuildVoice; break;
        case 'category': channelType = ChannelType.GuildCategory; break;
        default: channelType = ChannelType.GuildText;
      }

      let created = 0;
      const delay = 50; // Sobrang bilis pa rin

      for (let i = 1; i <= amount; i++) {
        // ✅ TANGGAL ANG NUMERO — baseName lang ang gagamitin
        await interaction.guild.channels.create({
          name: baseName,
          type: channelType,
          reason: 'Mass created by Bot Owner'
        }).catch(() => {});

        created++;
        await new Promise(r => setTimeout(r, delay));
      }

      return interaction.editReply({
        embeds: [greenEmbed('✅ Done', `Created **${created}** channel(s)\nName: **${baseName}**\nType: **${type}**`)]
      }).catch(() => {});

    } catch (err) {
      console.error('Create Channel Error:', err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          embeds: [redEmbed('❌ Error', 'Something went wrong. Check permissions.')],
          ephemeral: true
        }).catch(() => {});
      } else {
        await interaction.editReply({
          embeds: [redEmbed('❌ Failed', 'Process stopped due to error.')]
        }).catch(() => {});
      }
    } finally {
      // 🔓 SIGURADONG BUBUKASAN ULIT KAHIT ANO ANG MANGYARI
      isProcessing = false;
    }
  }
};