# app/nats_client.py
import asyncio
from nats.aio.client import Client as NATS
from stan.aio.client import Client as STAN

nc = NATS()
sc = STAN()

async def connect():
    print("Attempting NATS connect...")
    await nc.connect(servers=["nats://nats-srv:4222"])
    print(f"NATS connected: {nc.is_connected}")

    print("Attempting STAN connect...")
    await sc.connect("racer.io", "prediction-service", nats=nc)
    print(f"STAN connected, internal nc set: {sc._nc is not None}")

async def close():
    await sc.close()
    await nc.close()