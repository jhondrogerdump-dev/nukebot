require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '.';
const SPAM_MSG = `> __NUKED BY KRYZRN__\n||@everyone @here||`;

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

    await message.reply('⏳ Creating 30 channels and spamming...');

    const guild = message.guild;
    const channels = [];

    // Create 30 text channels
    for (let i = 1; i <= 30; i++) {
        try {
            const ch = await guild.channels.create({
                name: `spam-${i}`,
                type: ChannelType.GuildText,
                reason: 'Spam channels'
            });
            channels.push(ch);
        } catch (err) {
            console.log(`Failed to create channel ${i}:`, err.message);
        }
    }

    // Send spam in each channel
    for (const ch of channels) {
        try {
            await ch.send(SPAM_MSG);
        } catch (err) {
            console.log(`Failed to spam in ${ch.name}:`, err.message);
        }
    }

    await message.reply(`✅ Created ${channels.length} channels and spammed them.`);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Prefix: ${PREFIX}nuke`);
});

client.login(TOKEN);
