const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

const args = process.argv.slice(2);

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const entry = args.find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length) : fallback;
}

function readNumberArg(name, fallback) {
  const value = Number(readArg(name, String(fallback)));
  return Number.isFinite(value) ? value : fallback;
}

function resolveJwtKey() {
  const explicitKey = readArg('jwt-key', process.env.JWT_KEY || '');
  if (explicitKey) {
    return explicitKey;
  }

  try {
    const base64Secret = execSync('kubectl get secret jwt-secret -o jsonpath="{.data.JWT_KEY}"', {
      stdio: ['ignore', 'pipe', 'ignore'],
      encoding: 'utf8',
    }).trim();

    if (!base64Secret) {
      throw new Error('jwt-secret is empty');
    }

    return Buffer.from(base64Secret, 'base64').toString('utf8');
  } catch (error) {
    throw new Error(
      'JWT key not provided. Set JWT_KEY, pass --jwt-key=..., or make kubectl available so the script can read the jwt-secret Kubernetes secret.'
    );
  }
}

const serverUrl = readArg('url', process.env.SIM_SERVER_URL || 'https://ticket.com');
const durationMs = readNumberArg('duration-ms', 10000);
const intervalMs = readNumberArg('interval-ms', 250);
const outputFile = path.resolve(process.cwd(), readArg('output', 'dataset/two-player-sim.jsonl'));
const allowInsecureTls = readArg('allow-insecure-tls', process.env.ALLOW_INSECURE_TLS || 'true') !== 'false';

if (allowInsecureTls && /^https:|^wss:/i.test(serverUrl)) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const playerOne = {
  id: readArg('user1-id', 'sim-player-1'),
  email: readArg('user1-email', 'player1@example.com'),
};

const playerTwo = {
  id: readArg('user2-id', 'sim-player-2'),
  email: readArg('user2-email', 'player2@example.com'),
};

function createTrack(seedX, seedY, velocityScale, offset) {
  return (progress) => {
    const arc = Math.sin(progress * Math.PI * 2 + offset) * 0.0015;
    const drift = Math.cos(progress * Math.PI * 1.25 + offset) * 0.001;
    const x = seedX + progress * 0.04 + arc;
    const y = seedY + progress * 0.02 + drift;
    const vx = 0.04 * velocityScale + Math.cos(progress * Math.PI * 2 + offset) * 0.002;
    const vy = 0.02 * velocityScale + Math.sin(progress * Math.PI * 2 + offset) * 0.002;
    const speed = Math.sqrt(vx * vx + vy * vy);

    return {
      x,
      y,
      vx,
      vy,
      speed,
      heading: (Math.atan2(vy, vx) * 180) / Math.PI,
    };
  };
}
async function main() {
  fs.mkdirSync(path.dirname(outputFile), { recursive: true });
  const output = fs.createWriteStream(outputFile, { flags: 'w' });
  const jwtKey = resolveJwtKey();

  const tokens = [playerOne, playerTwo].map((player) =>
    jwt.sign({ id: player.id, email: player.email }, jwtKey, { expiresIn: '1h' })
  );

  const sockets = tokens.map((token) =>
    io(serverUrl, {
      transports: ['websocket', 'polling'],
      auth: { token },
      rejectUnauthorized: !allowInsecureTls,
    })
  );

  await Promise.all(
    sockets.map(
      (socket) =>
        new Promise((resolve, reject) => {
          socket.once('connect', resolve);
          socket.once('connect_error', reject);
          socket.once('error', reject);
        })
    )
  );

  const startedAt = Date.now();
  const endAt = startedAt + durationMs;
  const trackOne = createTrack(-73.9857, 40.7484, 1, 0.2);
  const trackTwo = createTrack(-73.985, 40.748, 0.96, 1.6);

  let tick = 0;
  const timer = setInterval(() => {
    const now = Date.now();
    const progress = Math.min((now - startedAt) / durationMs, 1);
    const timestamp = new Date(now).toISOString();

    const samples = [
      { player: playerOne, socket: sockets[0], track: trackOne(progress), lane: 'leader' },
      { player: playerTwo, socket: sockets[1], track: trackTwo(progress), lane: 'chaser' },
    ];

    for (const sample of samples) {
      const payload = {
        x: sample.track.x,
        y: sample.track.y,
        vx: sample.track.vx,
        vy: sample.track.vy,
        speed: sample.track.speed,
        heading: sample.track.heading,
        timestamp,
        source: 'client',
      };

      sample.socket.emit('position:update', payload);
      output.write(
        JSON.stringify({
          runId: 'two-player-sim',
          tick,
          timestamp,
          playerId: sample.player.id,
          email: sample.player.email,
          lane: sample.lane,
          ...payload,
        }) + '\n'
      );
    }

    tick += 1;

    if (now >= endAt) {
      clearInterval(timer);
      for (const socket of sockets) {
        socket.close();
      }
      output.end(() => {
        console.log(`Wrote ${tick * 2} samples to ${outputFile}`);
        process.exit(0);
      });
    }
  }, intervalMs);

  process.on('SIGINT', () => {
    clearInterval(timer);
    for (const socket of sockets) {
      socket.close();
    }
    output.end(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});