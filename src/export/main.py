import discord
import chat_exporter
import argparse
import asyncio
import os

async def export_chat(token, channel_id, output_file, limit=100, tz_info="UTC", military_time=False):
    intents = discord.Intents.default()
    intents.members = True
    intents.messages = True
    intents.reactions = True
    client = discord.Client(intents=intents)

    @client.event
    async def on_ready():
        print(f"logged in as {client.user}")
        channel = client.get_channel(channel_id)
        if channel is None:
            print("channel id is invalid")
            await client.close()
            return

        try:
            transcript = await chat_exporter.export(
                channel=channel,
                limit=limit,
                tz_info=tz_info,
                military_time=military_time,
                bot=client,
                fancy_times=True  
            )

            if transcript is None:
                print("no transcript generated")
            else:
                os.makedirs(os.path.dirname(output_file), exist_ok=True)
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write(transcript)
                print(f"Transcript saved to {os.path.abspath(output_file)}")

        except Exception as e:
            print(f"an error occurred: {e}")

        finally:
            await client.close()

    await client.start(token)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export Discord chat logs")
    parser.add_argument("-t", "--token", required=True, help="Discord bot token")
    parser.add_argument("-c", "--channel_id", type=int, required=True, help="Discord channel ID")
    parser.add_argument("-o", "--output_file", required=True, help="Output file path")
    parser.add_argument("-l", "--limit", type=int, default=100, help="Message limit")
    parser.add_argument("--tz_info", type=str, default="UTC", help="Timezone info")
    parser.add_argument("--military_time", action="store_true", help="24 hr format")

    args = parser.parse_args()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(export_chat(args.token, args.channel_id, args.output_file, args.limit, args.tz_info, args.military_time))
