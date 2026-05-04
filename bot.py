import discord
import os
from datetime import datetime, timedelta
from flask import Flask
from threading import Thread

# ===== CONFIGURATION =====
CHANNEL_ID = 1500641255233814718  # Your channel ID (just the number, no quotes)
UPDATE_MINUTES = 1
# ========================

# Spawn intervals in minutes
INTERVALS = {
    'Amethyst Egg': 1440,  # 24 hours
    'Legendary': 5,        # 5 minutes
    'Mythical': 60,        # 60 minutes
    'Lucky Block': 30      # 30 minutes
}

# When each spawn type starts for the first time (24-hour format)
ANCHOR_TIMES = {
    'Amethyst Egg': {'hour': 17, 'minute': 0},   # 5:00 PM
    'Legendary': {'hour': 18, 'minute': 0},      # 6:00 PM
    'Mythical': {'hour': 18, 'minute': 0},       # 6:00 PM
    'Lucky Block': {'hour': 18, 'minute': 0}     # 6:00 PM
}

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

def get_next_spawn_time(spawn_type):
    """Calculate next Unix timestamp for a spawn type"""
    now = datetime.now()
    anchor = ANCHOR_TIMES[spawn_type]
    interval = INTERVALS[spawn_type]
    
    # Create today's anchor time
    anchor_time = now.replace(hour=anchor['hour'], minute=anchor['minute'], second=0, microsecond=0)
    
    # If anchor already passed today, use tomorrow
    if anchor_time < now:
        anchor_time += timedelta(days=1)
    
    # For Amethyst (daily), just return anchor
    if spawn_type == 'Amethyst Egg':
        return int(anchor_time.timestamp())
    
    # For interval-based spawns, find next occurrence
    next_spawn = anchor_time
    while next_spawn <= now:
        next_spawn += timedelta(minutes=interval)
    
    return int(next_spawn.timestamp())

def create_message():
    """Generate the spawn timer message"""
    lines = ["**📅 Guaranteed Spawns:**\n"]
    
    # Calculate all times
    times = {}
    for spawn_type in INTERVALS.keys():
        times[spawn_type] = get_next_spawn_time(spawn_type)
    
    # Add Amethyst (special daily format)
    lines.append(f"🟣 **Amethyst Egg** (Daily)")
    lines.append(f"<t:{times['Amethyst Egg']}:f> (<t:{times['Amethyst Egg']}:R>)\n")
    
    # Add others
    lines.append(f"🟠 **Lucky Block** (Every 30 min)")
    lines.append(f"<t:{times['Lucky Block']}:t> (<t:{times['Lucky Block']}:R>)\n")
    
    lines.append(f"🔵 **Mythical** (Every 60 min)")
    lines.append(f"<t:{times['Mythical']}:t> (<t:{times['Mythical']}:R>)\n")
    
    lines.append(f"🟢 **Legendary** (Every 5 min)")
    lines.append(f"<t:{times['Legendary']}:t> (<t:{times['Legendary']}:R>)\n")
    
    lines.append(f"*First spawns: Amethyst at 5:00 PM, others at 6:00 PM*")
    lines.append(f"*Updates every {UPDATE_MINUTES} minute*")
    
    return '\n'.join(lines)

# Flask keep-alive server (simple, no port issues)
app = Flask('')
@app.route('/')
def home():
    return "Bot is running!"

def run_server():
    app.run(host='0.0.0.0', port=8080)

# Discord events
@client.event
async def on_ready():
    print(f"✅ Bot online: {client.user.name}")
    print(f"📝 Channel ID: {CHANNEL_ID}")
    
    channel = client.get_channel(CHANNEL_ID)
    if not channel:
        print(f"❌ Channel {CHANNEL_ID} not found!")
        print(f"📋 Available channels:")
        for ch in client.get_all_channels():
            print(f"   #{ch.name} ({ch.id})")
        return
    
    print(f"✅ Found channel: #{channel.name}")
    
    # Send initial message
    try:
        msg = await channel.send(create_message())
        print(f"📝 Initial message sent!")
        
        # Update every minute
        while True:
            await msg.edit(content=create_message())
            print(f"✅ Updated at {datetime.now().strftime('%I:%M:%S %p')}")
            await client.wait_for('message', timeout=UPDATE_MINUTES * 60)
    except Exception as e:
        print(f"Error: {e}")

# Start the bot
if __name__ == "__main__":
    # Start web server in background
    Thread(target=run_server, daemon=True).start()
    
    # Get token
    token = os.getenv('DISCORD_BOT_TOKEN')
    if not token:
        print("❌ DISCORD_BOT_TOKEN environment variable not set!")
        exit(1)
    
    print("🔄 Attempting to login...")
    client.run(token)
