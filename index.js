const { Client, GatewayIntentBits, PermissionsBitField, ChannelType, REST } = require('discord.js');
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

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`Bot is ready to nuke!`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!nuke')) return;

    const guild = message.guild;
    if (!guild) {
        return message.reply('❌ This command can only be used in a server.');
    }

    const member = message.member;
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return message.reply('❌ You need **Manage Channels** or **Administrator** permission to use this command.');
    }

    if (nukingGuilds.has(guild.id)) {
        return message.reply('⚠️ A nuke operation is already running in this server. Please wait.');
    }

    nukingGuilds.add(guild.id);

    const replyMsg = await message.reply('💣 **NUKE INITIATED** 💣\nCreating 67 channels and sending 10 mass pings in each...');

    let createdChannels = 0;
    let failedChannels = 0;

    for (let i = 0; i < 67; i++) {
        const nameIndex = i % channelNames.length;
        let baseName = channelNames[nameIndex];
        const cycle = Math.floor(i / channelNames.length);
        const channelName = cycle === 0 ? baseName : `${baseName}-${cycle + 1}`;

        try {
            const newChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildText,
                reason: 'Nuke by ' + message.author.tag
            });

            console.log(`✅ Created channel #${channelName}`);

            // Send 10 pings in the new channel
            for (let pingCount = 0; pingCount < 10; pingCount++) {
                try {
                    await newChannel.send(pingMessage);
                    await delay(200); // small delay between messages
                } catch (sendErr) {
                    console.error(`Failed to send message in ${channelName}:`, sendErr.message);
                }
            }
            createdChannels++;
            await delay(800); // delay between channel creations to avoid rate limits

        } catch (err) {
            console.error(`❌ Failed to create channel ${channelName}:`, err.message);
            failedChannels++;
        }
    }

    nukingGuilds.delete(guild.id);

    await replyMsg.edit(`🎉 **NUKE COMPLETE** 🎉\n✅ Created: ${createdChannels} channels\n❌ Failed: ${failedChannels} channels\n💥 All channels received 10 mass pings.`);
});

client.login(process.env.TOKEN);
