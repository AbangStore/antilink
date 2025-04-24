import { Client, GatewayIntentBits, Partials, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ========== CONFIG ========== //
const BYPASS_ROLE_IDS = ['1082503125199487055']; // Role yang bisa bypass (misal: admin)
const ALLOWED_ROLE_IDS = ['1108297458699735040']; // Role yang bisa kirim link
const ANTI_LINK_CHANNEL_IDS = ['1082503127590248470', '1360953621658861579']; // Channel yang perlu anti-link
const LOG_CHANNEL_ID = '1268480162886844467'; // Channel log
const TIMEOUT_DURATION_MS = 3000 * 60 * 1000; // Timeout 3000 menit (50 jam)
// ============================ //

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const inTargetChannel = ANTI_LINK_CHANNEL_IDS.includes(message.channel.id);
  if (!inTargetChannel) return;

  const hasAllowedRole = message.member.roles.cache.some(role => ALLOWED_ROLE_IDS.includes(role.id));
  if (hasAllowedRole) return;

  const hasBypassRole = message.member.roles.cache.some(role => BYPASS_ROLE_IDS.includes(role.id));
  if (hasBypassRole) return;

  const linkRegex = /(https?:\/\/[^\s]+)/gi;
  if (linkRegex.test(message.content)) {
    try {
      await message.delete();

      const member = await message.guild.members.fetch(message.author.id);
      if (member.moderatable) {
        await member.timeout(TIMEOUT_DURATION_MS, 'Mengirim link tanpa izin');

        await message.author.send(
          `🚫 Kamu telah di-timeout selama ${TIMEOUT_DURATION_MS / 60000} menit (sekitar ${Math.floor(TIMEOUT_DURATION_MS / 60000)} menit) karena mengirim link di **#${message.channel.name}**.`
        );
      }

      const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
      if (logChannel && logChannel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setTitle('🔗 Link Dihapus & Timeout Diberlakukan')
          .setColor('Red')
          .addFields(
            { name: 'User', value: `${message.author.tag} (<@${message.author.id}>)`, inline: true },
            { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
            { name: 'Durasi Timeout', value: `${TIMEOUT_DURATION_MS / 60000} menit`, inline: true },
            { name: 'Pesan', value: `\`\`\`${message.content.slice(0, 1000)}\`\`\`` },
          )
          .setTimestamp()
          .setFooter({
            text: `Server: ${message.guild.name}`,
            iconURL: 'https://cdn.discordapp.com/attachments/1344574265290260520/1364555287062904903/ChatGPT_Image_23_Apr_2025_16.54.24.png?ex=680ac164&is=68096fe4&hm=95c3e5b2b1bb2982aabdb10e4fa4d3ef0a150c2fbfec588e0fa4b963c79cdd99&',
          });

        logChannel.send({ embeds: [embed] });
      }

      console.log(`🛡️ Link dari ${message.author.tag} dihapus dan timeout diterapkan.`);
    } catch (err) {
      console.error('Gagal menghapus pesan atau timeout:', err);
    }
  }
});

client.login(process.env.BOT_TOKEN);
