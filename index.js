const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ===== CONFIGURATION - EDIT THESE TWO LINES =====
const CHANNEL_ID = 'YOUR_CHANNEL_ID_HERE';     // Replace with your Discord channel ID
const UPDATE_MINUTES = 5;                      // How often to update (in minutes)
// ================================================

// Spawn offsets (minutes from current time)
const OFFSETS = {
    legendary: 0,
    mythical: 15,
    luckyBlock: 30,
    amethystEgg: 60
};

let messageId = null;

// Format Unix timestamp for Discord
function getUnixTimestamp(minutesFromNow) {
    const timestamp = Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
    return `<t:${timestamp}:t>`;
}

// Generate the message content
function getMessage() {
    return `**Guaranteed Spawns:**
Legendary: ${getUnixTimestamp(OFFSETS.legendary)}
Mythical: ${getUnixTimestamp(OFFSETS.mythical)}
Lucky Block: ${getUnixTimestamp(OFFSETS.luckyBlock)}
Amethyst Egg: ${getUnixTimestamp(OFFSETS.amethystEgg)}

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
    
    // Initial message after 2 seconds
    setTimeout(updateMessage, 2000);
    
    // Schedule periodic updates
    setInterval(updateMessage, UPDATE_MINUTES * 60 * 1000);
});

// Error handling
client.on('error', (error) => {
    console.error('Discord client error:', error);
});

// Get token from environment variables
const TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!TOKEN) {
    console.error('❌ DISCORD_BOT_TOKEN environment variable not set!');
    process.exit(1);
}

client.login(TOKEN);
