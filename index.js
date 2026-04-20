const { Client, GatewayIntentBits, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

const nukingGuilds = new Set();

const channelNames = [
    "Nuked by nexiro",
    "tamed by nex",
    "nuked by untog"
];

const pingMessage = `> tamed by aikoware, kryzen
__denzxu bading HAHAHA IYAK kana boy sama mo na xenondot nyo__
@everyone @here`;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Global error handler to prevent crashing
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
    // Don't crash – just log
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`Bot is ready. Use !nuke in a server with Manage Channels permission.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!nuke')) return;

    const guild = message.guild;
    if (!guild) {
        return message.reply('❌ This command can only be used in a server.');
    }

    const member = message.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ You need **Manage Channels** or **Administrator** permission.');
    }

    // Check bot permissions
    const botMember = guild.members.me;
    if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
        return message.reply('❌ I need **Manage Channels** permission to create channels.');
    }
    if (!botMember.permissions.has(PermissionsBitField.Flags.MentionEveryone)) {
        return message.reply('❌ I need **Mention Everyone** permission to send @everyone / @here.');
    }

    if (nukingGuilds.has(guild.id)) {
        return message.reply('⚠️ A nuke operation is already running in this server. Wait.');
    }

    nukingGuilds.add(guild.id);
    const replyMsg = await message.reply('💣 **NUKE INITIATED** – creating 67 channels with 10 mass pings each...');

    let createdChannels = 0;
    let failedChannels = 0;

    for (let i = 0; i < 67; i++) {
        const nameIndex = i % channelNames.length;
        let baseName = channelNames[nameIndex];
        const cycle = Math.floor(i / channelNames.length);
        const channelName = cycle === 0 ? baseName : `${baseName}-${cycle + 1}`;

        try {
            // Create channel with a small retry mechanism
            let newChannel = null;
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    newChannel = await guild.channels.create({
                        name: channelName,
                        type: ChannelType.GuildText,
                        reason: `Nuke by ${message.author.tag}`
                    });
                    break;
                } catch (err) {
                    if (attempt === 2) throw err;
                    await delay(2000);
                }
            }

            if (!newChannel) throw new Error('Channel creation failed after retries');

            console.log(`✅ Created #${channelName}`);

            // Wait a bit for Discord to fully register the channel
            await delay(1000);

            // Send 10 pings
            for (let pingCount = 0; pingCount < 10; pingCount++) {
                try {
                    await newChannel.send(pingMessage);
                } catch (sendErr) {
                    console.error(`Failed to send ping #${pingCount + 1} in ${channelName}:`, sendErr.message);
                    // Continue with next ping
                }
                await delay(500); // longer delay between pings to avoid rate limits
            }

            createdChannels++;
            await delay(1200); // delay between channel creations

        } catch (err) {
            console.error(`❌ Failed to create ${channelName}:`, err.message);
            failedChannels++;
            // If rate limited, wait extra
            if (err.status === 429) {
                const retryAfter = err.retryAfter || 5;
                console.log(`Rate limited – waiting ${retryAfter}s`);
                await delay(retryAfter * 1000);
            }
        }
    }

    nukingGuilds.delete(guild.id);
    await replyMsg.edit(`🎉 **NUKE COMPLETE**\n✅ Created: ${createdChannels} channels\n❌ Failed: ${failedChannels}\n💥 Each channel received 10 mass pings.`);
});

client.login(process.env.TOKEN); 
