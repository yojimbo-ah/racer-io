# app/nats_client.py
import asyncio
from nats.aio.client import Client as NATS
from stan.aio.client import Client as STAN

nc = NATS()
sc = STAN()

async def connect():
    await nc.connect(servers=["nats://nats-server:4222"])  # match your k8s service name
    await sc.connect("test-cluster", "prediction-service", nats=nc)  # cluster id from your existing NATS Streaming setup

async def close():
    await sc.close()
    await nc.close()