# app/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager
import torch, json
from src.app.nats_client import nc, sc, connect, close

"""""
after creating the model we will use it right here

model = torch.load("model.pt")
model.eval()

async def on_position_update(msg):
    data = json.loads(msg.data)
    x = torch.tensor([[data["age"], data["gender"], data["num_previous_races"], data["avg_speed"]]])
    with torch.no_grad():
        prob = model(x).item()

    await sc.publish("prediction.updated", json.dumps({
        "raceId": data["raceId"],
        "userId": data["userId"],
        "winProbability": prob
    }).encode())

    
@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect()
    await sc.subscribe("position.updated", cb=on_position_update, durable_name="prediction-service-durable")
    yield
    await close()
"""
    
app = FastAPI()

@app.get("/health")
def health():
    return {"status": "ok"}