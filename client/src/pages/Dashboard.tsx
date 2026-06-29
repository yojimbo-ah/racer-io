import { useEffect, useRef, useState } from 'react'
import './Dashboard.css'
import { createPositionSocket, type PositionSnapshot } from '../socket'
import { useAuth } from '../context/AuthContext'

const getServerUrl = () => {
  if (window.location.hostname === 'ticket.com' ) {
    return `/api/positions/`
  }
  return 'https://localhost:3000'
}

const serverUrl = getServerUrl()

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

const initialPosition: PositionSnapshot = {
  x: 12,
  y: 22,
  vx: 4,
  vy: 2,
  speed: 48,
}

const bounds = {
  min: 6,
  max: 94,
}

const advancePosition = (position: PositionSnapshot): PositionSnapshot => {
  let nextX = position.x + position.vx
  let nextY = position.y + position.vy
  let nextVx = position.vx
  let nextVy = position.vy

  if (nextX <= bounds.min || nextX >= bounds.max) {
    nextVx = -nextVx
    nextX = Math.min(bounds.max, Math.max(bounds.min, nextX))
  }

  if (nextY <= bounds.min || nextY >= bounds.max) {
    nextVy = -nextVy
    nextY = Math.min(bounds.max, Math.max(bounds.min, nextY))
  }

  return {
    x: nextX,
    y: nextY,
    vx: nextVx,
    vy: nextVy,
    speed: position.speed,
  }
}

const headingFromVector = ({ vx, vy }: PositionSnapshot) =>
  Math.round((Math.atan2(vy, vx) * 180) / Math.PI)

export const Dashboard = () => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>('connecting')
  const [position, setPosition] = useState<PositionSnapshot>(initialPosition)
  const [lastSentAt, setLastSentAt] = useState<string>('Waiting for first emit')
  const [socketId, setSocketId] = useState<string>('not connected')
  const { user, logout , getToken} = useAuth()

  const socketRef = useRef<ReturnType<typeof createPositionSocket> | null>(null)
  const positionRef = useRef(position)

  useEffect(() => {
    positionRef.current = position
  }, [position])

  useEffect(() => {
    console.log('Creating socket connection to:', serverUrl)
    const socket = createPositionSocket(serverUrl , getToken()) ;
    socketRef.current = socket

    socket.on('connect', () => {
      console.log('✓ Socket connected:', socket.id)
      setConnectionState('connected')
      setSocketId(socket.id ?? 'connected')
    })

    socket.on('disconnect', () => {
      console.log('✗ Socket disconnected')
      setConnectionState('disconnected')
      setSocketId('not connected')
    })

    socket.on('connect_error', (error) => {
      console.error('✗ Socket connection error:', error)
      setConnectionState('error')
      setSocketId('not connected')
    })

    socket.on('position:update', (payload) => {
      console.log('Position update received:', payload)
    })

    // all of these socket connection will be moved into another page 
    // just putting them here to just try them if they gonna 
    // work or not
    socket.on('recieve_race' , (data) => {

    })

    socket.on('race_cancelled' , (data) => {

    })

    socket.on('race_finished' , (data) => {

    })
    socket.on('race_started' , (data) =>{

    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    const emitPosition = () => {
      const nextPosition = advancePosition(positionRef.current)
      positionRef.current = nextPosition
      setPosition(nextPosition)

      const payload = {
        ...nextPosition,
        heading: headingFromVector(nextPosition),
        timestamp: new Date().toISOString(),
        source: 'client' as const,
      }

      socketRef.current?.emit('position:update', payload)
      setLastSentAt(payload.timestamp)
    }

    emitPosition()
    const intervalId = window.setInterval(emitPosition, 3000)

    return () => window.clearInterval(intervalId)
  }, [])

  const connectionTone = {
    connecting: 'yellow',
    connected: 'green',
    disconnected: 'slate',
    error: 'red',
  }[connectionState]

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <h1>🏎️ Racer.io</h1>
        </div>
        <div className="header-right">
          <span className="user-email">{user?.email}</span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <div className="dashboard-container">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">racer.io client</p>
            <h2>Websocket position broadcaster</h2>
            <p className="lede">
              This React client connects to the positions service and emits the
              current position snapshot every 3 seconds.
            </p>
          </div>

          <div className="status-grid">
            <article className={`status-card status-${connectionTone}`}>
              <span className="label">Socket status</span>
              <strong>{connectionState}</strong>
              <span className="subtle">{serverUrl}</span>
            </article>

            <article className="status-card">
              <span className="label">Socket id</span>
              <strong>{socketId}</strong>
              <span className="subtle">Connected client instance</span>
            </article>

            <article className="status-card">
              <span className="label">Last emit</span>
              <strong>{lastSentAt}</strong>
              <span className="subtle">Emits on a 3 second interval</span>
            </article>

            <article className="status-card">
              <span className="label">Current position</span>
              <strong>
                {position.x.toFixed(2)}, {position.y.toFixed(2)}
              </strong>
              <span className="subtle">X, Y coordinates</span>
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}
