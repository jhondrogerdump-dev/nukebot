require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '.';
const SPAM_MSG = `> __NUKED BY KRYZRN FUCK ALL SHITS NIGGA ASSHOLE! SHIRO SUPOT TANDAAN NYO YAN__\n||@everyone @here||`;
const CHANNEL_COUNT = 68;
const MSG_PER_CHANNEL = 5;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        return message.reply('❌ Admin only.');
    }

    const cmd = message.content.slice(PREFIX.length).trim().toLowerCase();
    if (cmd !== 'nuke') return;

    await message.reply(`⏳ Creating ${CHANNEL_COUNT} channels and spamming each with ${MSG_PER_CHANNEL} messages...`);

    const guild = message.guild;
    let created = 0;

    for (let i = 1; i <= CHANNEL_COUNT; i++) {
        try {
            // Create channel
            const channel = await guild.channels.create({
                name: `spam-${i}`,
                type: ChannelType.GuildText,
                reason: 'Spam operation'
            });

            // Send message 5 times in the new channel
            for (let j = 0; j < MSG_PER_CHANNEL; j++) {
                await channel.send(SPAM_MSG);
                // tiny delay to avoid rate limit (optional but safer)
                await new Promise(r => setTimeout(r, 200));
            }

            created++;
        } catch (err) {
            console.error(`Failed on channel ${i}:`, err.message);
        }
    }

    await message.reply(`✅ Done. Created ${created}/${CHANNEL_COUNT} channels, sent ${MSG_PER_CHANNEL} messages each.`);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Ready. Prefix: ${PREFIX}nuke`);
});

client.login(TOKEN);
