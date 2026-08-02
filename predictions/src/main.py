# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import torch, json
from src.app.nats_client import nc, sc, connect, close





async def on_position_update(msg):
    data = json.loads(msg.data)
    print('event has been published sucuffuly from the prediction service')
    print(data)

    
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    sub = await sc.subscribe("race:started", cb=on_position_update, durable_name="prediction-service-durable")
    print(f"Subscribed successfully: {sub}")
    yield
    await close()

app = FastAPI(lifespan=lifespan)

@app.get("/health")
def health():
    return {"status": "ok"}