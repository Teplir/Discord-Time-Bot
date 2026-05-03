const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ===== CONFIGURATION =====
const CHANNEL_ID = '1500561425838379118';
const UPDATE_MINUTES = 5;

// Spawn intervals (in minutes)
// 5, 60, 30 minute intervals + 1 daily at 5pm
const INTERVALS = {
    legendary: 5,      
    mythical: 60,      
    luckyBlock: 30,    
    amethystEgg: 1440  // 24 hours in minutes
};

// Daily anchor times (when the first spawn happens)
// After 5pm, next Amethyst is tomorrow 5pm
// After each spawn, next is interval minutes later
const ANCHOR_TIMES = {
    legendary: { hour: 18, minute: 55 },  // 6:55 PM start
    mythical: { hour: 19, minute: 0 },    // 7:00 PM start
    luckyBlock: { hour: 19, minute: 0 },  // 7:00 PM start
    amethystEgg: { hour: 17, minute: 0 }  // 5:00 PM start
};

let messageId = null;

// Calculate next spawn time based on interval and anchor
function getNextSpawnTime(type) {
    const now = new Date();
    const interval = INTERVALS[type];
    const anchor = ANCHOR_TIMES[type];
    
    // Create today's anchor time
    let anchorTime = new Date(now);
    anchorTime.setHours(anchor.hour, anchor.minute, 0, 0);
    
    // If anchor time already passed today, set to tomorrow
    if (anchorTime < now) {
        anchorTime.setDate(anchorTime.getDate() + 1);
    }
    
    if (interval === 1440) {
        // Daily spawn (once per day at anchor time)
        return Math.floor(anchorTime.getTime() / 1000);
    }
    
    // For interval-based spawns: find the next spawn after now
    // Start from anchor time, add intervals until we find one > now
    let spawnTime = new Date(anchorTime);
    while (spawnTime <= now) {
        spawnTime = new Date(spawnTime.getTime() + (interval * 60000));
    }
    
    return Math.floor(spawnTime.getTime() / 1000);
}

function getMessage() {
    const legendaryTime = getNextSpawnTime('legendary');
    const mythicalTime = getNextSpawnTime('mythical');
    const luckyBlockTime = getNextSpawnTime('luckyBlock');
    const amethystTime = getNextSpawnTime('amethystEgg');
    
    return `**Guaranteed Spawns:**
Legendary (every 5m): <t:${legendaryTime}:t> (<t:${legendaryTime}:R>)
Mythical (every 60m): <t:${mythicalTime}:t> (<t:${mythicalTime}:R>)
Lucky Block (every 30m): <t:${luckyBlockTime}:t> (<t:${luckyBlockTime}:R>)
Amethyst Egg (daily at 5pm EST): <t:${amethystTime}:t> (<t:${amethystTime}:R>)

*Updates every ${UPDATE_MINUTES} minutes*`;
}

async function updateMessage() {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) return;
    
    try {
        if (messageId) {
            const msg = await channel.messages.fetch(messageId);
            await msg.edit(getMessage());
        } else {
            const msg = await channel.send(getMessage());
            messageId = msg.id;
        }
        console.log('✅ Updated at', new Date().toLocaleTimeString());
    } catch (err) {
        messageId = null;
    }
}

// --- Dummy Web Server for Render ---
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Bot running!'));
app.listen(port, '0.0.0.0');
// ------------------------------------

client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    setTimeout(updateMessage, 2000);
    setInterval(updateMessage, UPDATE_MINUTES * 60 * 1000);
});

const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN not set!');
    process.exit(1);
}
client.login(TOKEN);
