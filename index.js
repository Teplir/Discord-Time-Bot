const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ===== CONFIGURATION =====
const CHANNEL_ID = '1500641255233814718';  // Your channel ID
const UPDATE_MINUTES = 1;  // Updates every minute
// ==================================

// Base anchor times (24-hour format)
const ANCHOR_TIMES = {
    legendary: { hour: 18, minute: 0 },      // 6:00 PM
    mythical: { hour: 18, minute: 0 },       // 6:00 PM
    luckyBlock: { hour: 18, minute: 0 },     // 6:00 PM
    amethystEgg: { hour: 17, minute: 0 }     // 5:00 PM
};

// Intervals in minutes
const INTERVALS = {
    legendary: 5,      // every 5 minutes (12 per hour)
    mythical: 60,      // every 60 minutes (1 per hour)
    luckyBlock: 30,    // every 30 minutes (2 per hour)
    amethystEgg: 1440  // every 1440 minutes (1 per day)
};

let messageId = null;

// Calculate next spawn time based on anchor and interval
function getNextSpawnTime(type) {
    const now = new Date();
    const anchor = ANCHOR_TIMES[type];
    const interval = INTERVALS[type];
    
    // Create today's anchor time
    let anchorTime = new Date(now);
    anchorTime.setHours(anchor.hour, anchor.minute, 0, 0);
    
    // If anchor already passed today, use tomorrow's anchor
    if (anchorTime < now) {
        anchorTime.setDate(anchorTime.getDate() + 1);
    }
    
    // For Amethyst Egg (daily), just return the anchor time
    if (type === 'amethystEgg') {
        return Math.floor(anchorTime.getTime() / 1000);
    }
    
    // For interval-based spawns, find the next spawn after now
    let nextSpawn = new Date(anchorTime);
    
    // Add intervals until we find a time > now
    while (nextSpawn <= now) {
        nextSpawn = new Date(nextSpawn.getTime() + (interval * 60000));
    }
    
    return Math.floor(nextSpawn.getTime() / 1000);
}

// Generate the message
function getMessage() {
    const legendaryTime = getNextSpawnTime('legendary');
    const mythicalTime = getNextSpawnTime('mythical');
    const luckyTime = getNextSpawnTime('luckyBlock');
    const amethystTime = getNextSpawnTime('amethystEgg');
    
    return `**Guaranteed Spawns:**

🟣 **Amethyst Egg** (Daily)
<t:${amethystTime}:f> (<t:${amethystTime}:R>)

🟠 **Lucky Block** (Every 30 min)
<t:${luckyTime}:t> (<t:${luckyTime}:R>)

🔵 **Mythical** (Every 60 min)
<t:${mythicalTime}:t> (<t:${mythicalTime}:R>)

🟢 **Legendary** (Every 5 min)
<t:${legendaryTime}:t> (<t:${legendaryTime}:R>)

*First spawn of each cycle starts at 5:00 PM (Amethyst) and 6:00 PM (others)*
*Updates every minute*`;
}

// Update the Discord message
async function updateMessage() {
    const channel = client.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error(`❌ Channel ${CHANNEL_ID} not found!`);
        console.log(`📋 Available channels:`);
        client.channels.cache.forEach(ch => {
            console.log(`   ${ch.name} (${ch.id})`);
        });
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
            console.log('📝 Initial message sent! Check Discord!');
        }
    } catch (err) {
        console.error('Error:', err.message);
        messageId = null;
    }
}

// Keep-alive web server for Render
const app = express();
const port = process.env.PORT || 10000;
app.get('/', (req, res) => res.send('Spawn timer bot running!'));
app.listen(port, '0.0.0.0', () => console.log(`Web server on port ${port}`));

// Discord bot ready event
client.once('ready', async () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    console.log(`📝 Looking for channel ID: ${CHANNEL_ID}`);
    
    // Force a channel check
    const testChannel = client.channels.cache.get(CHANNEL_ID);
    if (!testChannel) {
        console.error(`❌ Cannot find channel!`);
        console.log(`📋 Bot can see these channels:`);
        client.channels.cache.forEach(ch => {
            console.log(`   #${ch.name} (${ch.id})`);
        });
        return;
    }
    
    console.log(`✅ Found channel: #${testChannel.name}`);
    
    // Send a test message
    try {
        await testChannel.send("🟢 Spawn timer bot is online and working!");
        console.log(`✅ Test message sent to #${testChannel.name}`);
    } catch (err) {
        console.error(`❌ Cannot send message: ${err.message}`);
        return;
    }
    
    // Start the timer
    setTimeout(() => updateMessage(), 3000);
    setInterval(updateMessage, UPDATE_MINUTES * 60 * 1000);
});

client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Start the bot
const TOKEN = process.env.DISCORD_BOT_TOKEN;
if (!TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable not set!');
    process.exit(1);
}

console.log('🔄 Attempting to login to Discord...');
client.login(TOKEN);
