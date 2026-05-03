const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ===== CONFIGURATION =====
const CHANNEL_ID = '1500561425838379118';     // REPLACE WITH YOUR CHANNEL ID
const UPDATE_MINUTES = 5;                      // How often to check/update

// Fixed daily spawn times (EST - Eastern Standard Time)
const SPAWN_TIMES = {
    legendary: { hour: 18, minute: 55 },    // 6:55 PM (18:55)
    mythical: { hour: 19, minute: 0 },      // 7:00 PM (19:00)
    luckyBlock: { hour: 19, minute: 0 },    // 7:00 PM (19:00)
    amethystEgg: { hour: 17, minute: 0 }    // 5:00 PM (17:00)
};

let messageId = null;

// Get Unix timestamp for today's spawn time at specified hour/minute
function getDailyUnixTimestamp(hour, minute) {
    const now = new Date();
    let spawnTime = new Date(now);
    spawnTime.setHours(hour, minute, 0, 0);
    
    // If that time already passed today, schedule for tomorrow
    if (spawnTime < now) {
        spawnTime.setDate(spawnTime.getDate() + 1);
    }
    
    return Math.floor(spawnTime.getTime() / 1000);
}

// Generate the message content
function getMessage() {
    const legendaryTime = getDailyUnixTimestamp(SPAWN_TIMES.legendary.hour, SPAWN_TIMES.legendary.minute);
    const mythicalTime = getDailyUnixTimestamp(SPAWN_TIMES.mythical.hour, SPAWN_TIMES.mythical.minute);
    const luckyBlockTime = getDailyUnixTimestamp(SPAWN_TIMES.luckyBlock.hour, SPAWN_TIMES.luckyBlock.minute);
    const amethystEggTime = getDailyUnixTimestamp(SPAWN_TIMES.amethystEgg.hour, SPAWN_TIMES.amethystEgg.minute);
    
    return `**Guaranteed Spawns:**
Legendary: <t:${legendaryTime}:t> (<t:${legendaryTime}:R>)
Mythical: <t:${mythicalTime}:t> (<t:${mythicalTime}:R>)
Lucky Block: <t:${luckyBlockTime}:t> (<t:${luckyBlockTime}:R>)
Amethyst Egg: <t:${amethystEggTime}:t> (<t:${amethystEggTime}:R>)

*Times shown in your local timezone*
*Updates every ${UPDATE_MINUTES} minutes*`;
}

// Update the Discord message
async function updateMessage() {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error(`❌ Channel ${CHANNEL_ID} not found!`);
        return;
    }
    
    try {
        if (messageId) {
            const msg = await channel.messages.fetch(messageId);
            await msg.edit(getMessage());
            console.log('✅ Updated at', new Date().toLocaleTimeString());
        } else {
            const msg = await channel.send(getMessage());
            messageId = msg.id;
            console.log('📝 Initial message sent');
        }
    } catch (err) {
        console.error('Error updating message:', err.message);
        messageId = null;
    }
}

// --- Dummy Web Server for Render (keeps bot alive) ---
const app = express();
const port = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Discord Spawn Timer Bot is running!');
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Web server bound to port ${port}`);
});
// ----------------------------------------------------

// Discord Bot Events
client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📝 Targeting channel ID: ${CHANNEL_ID}`);
    console.log(`🕐 Spawn times (EST):`);
    console.log(`   Legendary: 6:55 PM`);
    console.log(`   Mythical: 7:00 PM`);
    console.log(`   Lucky Block: 7:00 PM`);
    console.log(`   Amethyst Egg: 5:00 PM`);
    
    setTimeout(updateMessage, 2000);
    setInterval(updateMessage, UPDATE_MINUTES * 60 * 1000);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable not set!');
    process.exit(1);
}

client.login(TOKEN);
