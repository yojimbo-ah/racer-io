import { useEffect, useRef, useState } from 'react'
import './Dashboard.css'
import { createPositionSocket } from '../socket'
import { useAuth } from '../context/AuthContext'

const getServerUrl = () => {
  if (window.location.hostname === 'ticket.com') {
    return `/api/positions/`
  }
  return 'https://localhost:3000'
}

const serverUrl = getServerUrl()

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

const headingFromCoords = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  return Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI)
}

export const Dashboard = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [lastSentAt, setLastSentAt] = useState<string>('Waiting for first emit')
  const [socketId, setSocketId] = useState<string>('not connected')
  const [coords, setCoords] = useState<{ lat: number; lng: number; speed: number } | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const { user, logout, getToken } = useAuth()

  const socketRef = useRef<ReturnType<typeof createPositionSocket> | null>(null)
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    const socket = createPositionSocket(serverUrl, getToken())
    socketRef.current = socket

    socket.on('connect', () => {
      setConnectionState('connected')
      setSocketId(socket.id ?? 'connected')
    })

    socket.on('disconnect', () => {
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

    socket.on('recieve_race', (data) => {
      console.log(data)
    })

    socket.on('race_cancelled', (data) => {
      console.log(data)
    })

    socket.on('race_finished', (data) => {
      console.log(data)
    })

    socket.on('race_started', (data) => {
      console.log(data)
    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation not supported by your browser')
      return
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed } = pos.coords
        const timestamp = new Date(pos.timestamp).toISOString()

        const heading = prevCoordsRef.current
          ? headingFromCoords(prevCoordsRef.current.lat, prevCoordsRef.current.lng, latitude, longitude)
          : 0

        prevCoordsRef.current = { lat: latitude, lng: longitude }
        setCoords({ lat: latitude, lng: longitude, speed: speed ?? 0 })
        setGpsError(null)

        const payload = {
          x: longitude,
          y: latitude,
          vx: 0,
          vy: 0,
          speed: speed ?? 0,
          heading,
          timestamp,
          source: 'client' as const,
        }

        socketRef.current?.emit('position:update', payload)
        setLastSentAt(timestamp)
      },
      (err) => {
        setGpsError(`GPS error: ${err.message}`)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [])
  const userAroundMe = async () => {
    const response = await fetch('https://ticket.com/api/positions/aroundme' , {
      method : 'GET' ,
      headers : {
        'Authorization' : `Bearer ${getToken()}`
      }
    })
    if (!response.ok) {
      console.log(response) ;
      throw new Error('Error happened')
    }

    const data = await response.json() ;
    console.log(data) ;

  }

  useEffect(() => {
    setInterval(userAroundMe , 20000) ; 
  } , [userAroundMe , setInterval]) ;

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
              <span className="subtle">Emits on position change</span>
            </article>

            <article className="status-card">
              <span className="label">Current position</span>
              {gpsError ? (
                <strong style={{ color: 'red' }}>{gpsError}</strong>
              ) : coords ? (
                <strong>{coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</strong>
              ) : (
                <strong>Acquiring GPS...</strong>
              )}
              {coords && (
                <span className="subtle">{(coords.speed * 3.6).toFixed(1)} km/h</span>
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  )
}