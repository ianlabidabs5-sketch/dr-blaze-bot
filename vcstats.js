const { EmbedBuilder } = require('discord.js');

// 📊 Storage
const userStats = new Map();
const voiceJoinTimes = new Map();

// ⏱️ Format time
const formatTime = (seconds) => {
  if (!seconds || seconds <= 0) return '0h 0m 0s';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h}h ${m}m ${s}s`;
};

module.exports = {
  trackMessage: (message) => {
    if (!message.guild || message.author.bot) return;
    if (!userStats.has(message.author.id)) {
      userStats.set(message.author.id, { messages: 0, voiceTime: 0 });
    }
    userStats.get(message.author.id).messages += 1;
  },

  trackVoiceState: (oldState, newState) => {
    const member = newState.member;
    if (!member || member.user.bot) return;
    const userId = member.id;

    if (!userStats.has(userId)) {
      userStats.set(userId, { messages: 0, voiceTime: 0 });
    }

    if (!oldState.channelId && newState.channelId) {
      voiceJoinTimes.set(userId, Date.now());
    }

    if (oldState.channelId && !newState.channelId) {
      const joinTime = voiceJoinTimes.get(userId);
      if (joinTime) {
        const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
        userStats.get(userId).voiceTime += timeSpent;
        voiceJoinTimes.delete(userId);
      }
    }

    if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      const joinTime = voiceJoinTimes.get(userId);
      if (joinTime) {
        const timeSpent = Math.floor((Date.now() - joinTime) / 1000);
        userStats.get(userId).voiceTime += timeSpent;
      }
      voiceJoinTimes.set(userId, Date.now());
    }
  },

  executeStats: async (interaction, redEmbed) => {
    try {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetId = targetUser.id;

      if (!userStats.has(targetId)) {
        userStats.set(targetId, { messages: 0, voiceTime: 0 });
      }

      const userData = userStats.get(targetId);
      const allUsers = Array.from(userStats.entries());

      const chatRanking = [...allUsers].sort((a, b) => b[1].messages - a[1].messages);
      const voiceRanking = [...allUsers].sort((a, b) => b[1].voiceTime - a[1].voiceTime);

      const chatRank = chatRanking.findIndex(u => u[0] === targetId) + 1;
      const voiceRank = voiceRanking.findIndex(u => u[0] === targetId) + 1;

      const topChat = chatRanking.slice(0, 7).map(([id, data], i) => {
        const badge = i === 0 ? '👑 ' : `#${i + 1} `;
        const member = interaction.guild.members.cache.get(id);
        const name = member ? member.user.tag : 'Unknown User';
        return `${badge}**${name}** — ${data.messages} messages`;
      }).join('\n') || 'No data available yet';

      const topVoice = voiceRanking.slice(0, 7).map(([id, data], i) => {
        const badge = i === 0 ? '👑 ' : `#${i + 1} `;
        const member = interaction.guild.members.cache.get(id);
        const name = member ? member.user.tag : 'Unknown User';
        return `${badge}**${name}** — ${formatTime(data.voiceTime)}`;
      }).join('\n') || 'No data available yet';

      const statsEmbed = new EmbedBuilder()
        .setColor('#2f3136')
        .setTitle(`📊 Statistics — ${targetUser.tag}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '💬 Total Messages', value: `${userData.messages}`, inline: true },
          { name: '🎤 Total Voice Time', value: `${formatTime(userData.voiceTime)}`, inline: true },
          { name: '🏆 Chat Rank', value: `#${chatRank} out of ${chatRanking.length}`, inline: true },
          { name: '🎖️ Voice Rank', value: `#${voiceRank} out of ${voiceRanking.length}`, inline: false },
          { name: '📈 Top 7 Chatters', value: topChat, inline: false },
          { name: '🎙️ Top 7 Voice Users', value: topVoice, inline: false }
        )
        .setTimestamp();

      return interaction.reply({ embeds: [statsEmbed] }).catch(() => {});

    } catch (err) {
      console.error('Stats error:', err);
      return interaction.reply({
        embeds: [redEmbed('❌ Error', 'Please try again, something went wrong.')],
        flags: 64
      }).catch(() => {});
    }
  }
};