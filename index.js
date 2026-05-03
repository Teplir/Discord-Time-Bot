const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
});

// ===== EDIT THESE THREE LINES =====
const TOKEN = process.env.DISCORD_BOT_TOKEN;  // Render will add this automatically
const CHANNEL_ID = '1500561425838379118';     // Paste your channel ID
const UPDATE_MINUTES = 1;                      // Change to your desired minutes
// ==================================

// Spawn offsets (minutes from now)
const OFFSETS = {
    legendary: 5,
    mythical: 60,
    luckyBlock: 30,
    amethystEgg: 1440
};

let messageId = null;

function getUnixTimestamp(minutesFromNow) {
    const timestamp = Math.floor(Date.now() / 1000) + (minutesFromNow * 60);
    return `<t:${timestamp}:t>`;
}

function getMessage() {
    return `**Guaranteed Spawns:**
Legendary: ${getUnixTimestamp(OFFSETS.legendary)}
Mythical: ${getUnixTimestamp(OFFSETS.mythical)}
Lucky Block: ${getUnixTimestamp(OFFSETS.luckyBlock)}
Amethyst Egg: ${getUnixTimestamp(OFFSETS.amethystEgg)}

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
        console.log('Updated at', new Date().toLocaleTimeString());
    } catch (err) {
        messageId = null;
    }
}

client.once('ready', () => {
    console.log(`✅ Bot online: ${client.user.tag}`);
    setTimeout(updateMessage, 2000);
    setInterval(updateMessage, UPDATE_MINUTES * 60 * 1000);
});

client.login(TOKEN);
