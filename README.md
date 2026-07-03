# racer.io

racer.io is a microservices racing app built around an API gateway, live position tracking, and race orchestration. Users reach the gateway first, then the gateway routes them to the React app, the auth service, the positions service, or the races service depending on the request.

## API Gateway

The API gateway is the Kubernetes ingress in `infra/k8s/ingress-srv.yaml`. It is the public entry point for the app and the browser connects to it first. It routes traffic to the correct service based on the request path:

- `/api/users` goes to the auth service.
- `/api/positions` and `/socket.io` go to the positions service.
- `/api/races` goes to the races service.
- everything else goes to the client service.

This keeps the browser talking to one public host while the backend remains split into isolated services. The browser loads the React app through the gateway, and the socket.io connection from the app is also proxied through the gateway to the positions service.

## Core Idea

The app is built around live location tracking and race orchestration. A user signs up through the client, the positions service keeps track of where users are, and the races service decides whether a race can be created, accepted, started, and finished and aslo works as archive currently (will be seperated to two services in the future).

## Architecture

- `client`: React front end for signup, login, the dashboard, and race history.
- `auth`: user signup, signin, and current-user endpoints.
- `positions`: receives location updates, finds nearby users, and emits position events.
- `races`: creates race records, handles acceptance, tracks active races, and marks them finished.
- `common`: shared events, middleware, enums, and error helpers : https://www.npmjs.com/package/@racer-io/common
- `infra`: Kubernetes manifests and ingress configuration for local or cluster deployment.

The services are intentionally split so each one owns its own data and responsibility:

- auth owns user accounts and stores them in its own MongoDB.
- positions owns live location state and stores it in its own Redis instance.
- races owns race records in its own MongoDB and race state in its own Redis instance.
- NATS is the event bus used to move events between services.

## Deployment Layout

The `skaffold.yaml` file builds and syncs the four app containers:

- `racer-auth`
- `racer-positions`
- `racer-races`
- `racer-client`

The `infra/k8s` folder wires the runtime pieces together:

- `ingress-srv.yaml` is the API gateway. It exposes the app on `ticket.com` and routes `/api/users`, `/api/positions`, `/api/races`, `/socket.io`, and the client root path.
- `auth-depl.yaml` runs the auth service with its own MongoDB and NATS.
- `positions-depl.yaml` runs the positions service with its own Redis and NATS.
- `races-depl.yaml` runs the races service with its own MongoDB, its own Redis, and NATS.
- `client-depl.yaml` serves the React app.
- `nats-depl.yaml` provides the event bus used for inter-service communication.

Each service owns its own storage. The databases and Redis instances are not shared between services.

## How The Flow Works

1. A user signs up in the client with a name, email, and password.
2. The auth service creates the user account and returns the authenticated session.
3. The client streams GPS updates to the positions service.
4. The positions service keeps track of nearby users and broadcasts position updates to Races service.
5. The client creates a race request when two users are close enough (validation and calulations are done to insure that the race could be possible)
6. The races service stores the race, waits for acceptance, and monitors the race until a winner is found.
7. all of this to insure a great race with microservices architactures for more details
it will detailed in the code 

## Service Diagram

```mermaid
flowchart LR
  Gateway[API Gateway / Ingress]
  Client[Client Service / React App]
  Auth[Auth Service]
  Positions[Positions Service]
  Races[Races Service]
  Common[Common Package]
  NATS[NATS Streaming]
  AuthMongo[(Auth MongoDB)]
  PositionsRedis[(Positions Redis)]
  RacesMongo[(Races MongoDB)]
  RacesRedis[(Races Redis)]

  User[Browser / User] --> Gateway
  Gateway --> Client
  Gateway --> Auth
  Gateway -->|/socket.io| Positions
  Gateway -->|/api/positions| Positions
  Gateway --> Races

  Auth --> AuthMongo
  Auth --> NATS

  Positions --> PositionsRedis
  Positions --> NATS

  Races --> RacesMongo
  Races --> RacesRedis
  Races --> NATS

  Common -.shared contracts.-> Auth
  Common -.shared contracts.-> Positions
  Common -.shared contracts.-> Races
```

## Request Flow

```mermaid
sequenceDiagram
  participant U as User / Browser
  participant G as API Gateway
  participant C as React App
  participant A as Auth
  participant P as Positions
  participant R as Races

  U->>G: Open the app in the browser
  G->>C: Serve the React app
  U->>G: Sign up with name, email, password
  G->>A: Route auth request to auth service
  U->>G: Open socket.io connection from the app
  G->>P: Proxy socket.io to positions service
  U->>G: Ask for nearby users
  G->>P: Route request to positions service
  U->>G: Create race request
  G->>R: Route request to races service
  R->>R: Validate radius and track race state
  R->>G: Publish race started / cancelled / finished updates
  G->>C: Deliver updates to the React app
```