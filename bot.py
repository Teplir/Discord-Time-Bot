import discord
import os
from datetime import datetime, timedelta
from flask import Flask
from threading import Thread
import asyncio

# ===== CONFIGURATION =====
CHANNEL_ID = 1500641255233814718  # Your channel ID
UPDATE_MINUTES = 1
# ========================

INTERVALS = {
    'Amethyst Egg': 1440,
    'Legendary': 5,
    'Mythical': 60,
    'Lucky Block': 30
}

ANCHOR_TIMES = {
    'Amethyst Egg': {'hour': 17, 'minute': 0},
    'Legendary': {'hour': 18, 'minute': 0},
    'Mythical': {'hour': 18, 'minute': 0},
    'Lucky Block': {'hour': 18, 'minute': 0}
}

intents = discord.Intents.default()
intents.message_content = True
client = discord.Client(intents=intents)

def get_next_spawn_time(spawn_type):
    now = datetime.now()
    anchor = ANCHOR_TIMES[spawn_type]
    interval = INTERVALS[spawn_type]
    
    anchor_time = now.replace(hour=anchor['hour'], minute=anchor['minute'], second=0, microsecond=0)
    
    if anchor_time < now:
        anchor_time += timedelta(days=1)
    
    if spawn_type == 'Amethyst Egg':
        return int(anchor_time.timestamp())
    
    next_spawn = anchor_time
    while next_spawn <= now:
        next_spawn += timedelta(minutes=interval)
    
    return int(next_spawn.timestamp())

def create_message():
    lines = ["**📅 Guaranteed Spawns:**\n"]
    
    times = {}
    for spawn_type in INTERVALS.keys():
        times[spawn_type] = get_next_spawn_time(spawn_type)
    
    lines.append(f"🟣 **Amethyst Egg** (Daily)")
    lines.append(f"<t:{times['Amethyst Egg']}:f> (<t:{times['Amethyst Egg']}:R>)\n")
    lines.append(f"🟠 **Lucky Block** (Every 30 min)")
    lines.append(f"<t:{times['Lucky Block']}:t> (<t:{times['Lucky Block']}:R>)\n")
    lines.append(f"🔵 **Mythical** (Every 60 min)")
    lines.append(f"<t:{times['Mythical']}:t> (<t:{times['Mythical']}:R>)\n")
    lines.append(f"🟢 **Legendary** (Every 5 min)")
    lines.append(f"<t:{times['Legendary']}:t> (<t:{times['Legendary']}:R>)\n")
    lines.append(f"*Updates every {UPDATE_MINUTES} minute*")
    
    return '\n'.join(lines)

# Flask web server (required for Render Web Service)
app = Flask('')
@app.route('/')
def home():
    return "Spawn timer bot running!"

def run_web_server():
    app.run(host='0.0.0.0', port=10000)

message_id = None

@client.event
async def on_ready():
    global message_id
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
    
    try:
        msg = await channel.send(create_message())
        message_id = msg.id
        print(f"📝 Initial message sent!")
    except Exception as e:
        print(f"Error sending message: {e}")
        return
    
    while True:
        await asyncio.sleep(UPDATE_MINUTES * 60)
        try:
            msg = await channel.fetch_message(message_id)
            await msg.edit(content=create_message())
            print(f"✅ Updated at {datetime.now().strftime('%I:%M:%S %p')}")
        except Exception as e:
            print(f"Update error: {e}")

# Start web server in background
thread = Thread(target=run_web_server, daemon=True)
thread.start()

token = os.getenv('DISCORD_BOT_TOKEN')
if not token:
    print("❌ DISCORD_BOT_TOKEN environment variable not set!")
    exit(1)

print("🔄 Attempting to login...")
client.run(token)
