import { useEffect, useRef, useState } from 'react'
import './Dashboard.css'
import { createPositionSocket } from '../socket'
import { useAuth } from '../context/AuthContext'
import { RaceMapPicker } from '../components/RaceMapPicker'
import type { GeoPoint } from '../types'

const getServerUrl = () => {
  if (window.location.hostname === 'ticket.com') {
    return '/api/positions/'
  }
  return 'https://localhost:3000'
}

const getApiUrl = () => {
  if (window.location.hostname === 'ticket.com') {
    return 'https://ticket.com'
  }
  return 'https://localhost:3000'
}

const serverUrl = getServerUrl()

type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error'

type RaceRequest = {
  userData: {
    user1: string
    user2: string
  }
  race: {
    startPos: { longitude: number; latitude: number }
    endPosition: { longitude: number; latitude: number }
    raceId: string
    raceStatus: string
  }
}

type PositionState = {
  lat: number
  lng: number
  speed: number
}

const headingFromCoords = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const dLng = lng2 - lng1
  const dLat = lat2 - lat1
  return Math.round((Math.atan2(dLng, dLat) * 180) / Math.PI)
}

export const Dashboard = () => {
  const { user, logout, getToken } = useAuth()

  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [lastSentAt, setLastSentAt] = useState<string>('Waiting for first emit')
  const [socketId, setSocketId] = useState<string>('not connected')
  const [coords, setCoords] = useState<PositionState | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  const [nearbyUsers, setNearbyUsers] = useState<string[]>([])
  const [selectedOpponent, setSelectedOpponent] = useState('')
  const [finishPosition, setFinishPosition] = useState<GeoPoint | null>(null)
  const [raceMessage, setRaceMessage] = useState<string | null>(null)
  const [incomingRace, setIncomingRace] = useState<RaceRequest | null>(null)
  const [isSubmittingRace, setIsSubmittingRace] = useState(false)

  const socketRef = useRef<ReturnType<typeof createPositionSocket> | null>(null)
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null)

  const loadNearbyUsers = async () => {
    try {
      const response = await fetch(`${getApiUrl()}/api/positions/aroundme`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      })

      if (!response.ok) {
        return
      }

      const data = (await response.json()) as { users?: string[] }
      const users = data.users ?? []

      setNearbyUsers(users)
      setSelectedOpponent((current) => current || users[0] || '')
    } catch (error) {
      console.error('Failed to load nearby users:', error)
    }
  }

  const sendRaceDecision = async (accept: boolean, raceId: string) => {
    const response = await fetch(`${getApiUrl()}/api/races/accept-race`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ raceId, accept }),
    })

    if (!response.ok) {
      throw new Error('Could not update the race request')
    }

    setIncomingRace(null)
    setRaceMessage(accept ? 'Race accepted.' : 'Race denied.')
  }

  const createRace = async () => {
    if (!coords || !selectedOpponent) {
      setRaceMessage('Pick a nearby user and wait for GPS to load first.')
      return
    }

    if (!finishPosition) {
      setRaceMessage('Pick the finish line on the map first.')
      return
    }

    setIsSubmittingRace(true)
    setRaceMessage(null)

    try {
      const response = await fetch(`${getApiUrl()}/api/races/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          friendId: selectedOpponent,
          startPos: {
            longitude: coords.lng,
            latitude: coords.lat,
          },
          finishPos: finishPosition,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.message || 'Could not create race')
      }

      setRaceMessage('Race request sent.')
    } catch (error) {
      setRaceMessage(error instanceof Error ? error.message : 'Could not create race')
    } finally {
      setIsSubmittingRace(false)
    }
  }

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
      console.error('Socket connection error:', error)
      setConnectionState('error')
      setSocketId('not connected')
    })

    socket.on('recieve_race', (data: RaceRequest) => {
      setIncomingRace(data)
      setRaceMessage('Incoming race request.')
    })

    socket.on('race_cancelled', () => {
      setIncomingRace(null)
      setRaceMessage('Race cancelled.')
    })

    socket.on('race_finished', () => {
      setRaceMessage('Race finished.')
    })

    socket.on('race_started', () => {
      setIncomingRace(null)
      setRaceMessage('Race started.')
    })

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [getToken])

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

  useEffect(() => {
    void loadNearbyUsers()

    const intervalId = window.setInterval(() => {
      void loadNearbyUsers()
    }, 20000)

    return () => window.clearInterval(intervalId)
  }, [getToken])

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
            <h2>Live race control</h2>
            <p className="lede">
              This client keeps your position streaming, loads users around you, lets you
              create a race, and surfaces incoming challenges as a popup.
            </p>
          </div>

          {raceMessage && <div className="toast-card">{raceMessage}</div>}

          <div className="race-layout">
            <section className="panel-card">
              <div className="panel-head">
                <div>
                  <p className="eyebrow">Nearby users</p>
                  <h3>Create a race</h3>
                </div>
                <button className="secondary-btn" onClick={() => void loadNearbyUsers()}>
                  Refresh
                </button>
              </div>

              <div className="field-group">
                <label>Opponent</label>
                <select
                  value={selectedOpponent}
                  onChange={(event) => setSelectedOpponent(event.target.value)}
                >
                  <option value="">Select a nearby user</option>
                  {nearbyUsers.map((nearbyUser) => (
                    <option key={nearbyUser} value={nearbyUser}>
                      {nearbyUser}
                    </option>
                  ))}
                </select>
              </div>

              <RaceMapPicker
                value={finishPosition}
                onChange={setFinishPosition}
                fallbackCenter={coords ? { latitude: coords.lat, longitude: coords.lng } : null}
              />

              <button className="primary-btn" onClick={() => void createRace()} disabled={isSubmittingRace}>
                {isSubmittingRace ? 'Sending...' : 'Challenge user'}
              </button>

              <div className="nearby-list">
                {nearbyUsers.length ? (
                  nearbyUsers.map((nearbyUser) => (
                    <span key={nearbyUser} className="nearby-chip">
                      {nearbyUser}
                    </span>
                  ))
                ) : (
                  <p className="subtle">No nearby users yet.</p>
                )}
              </div>
            </section>

            <section className="panel-card">
              <p className="eyebrow">Current stream</p>
              <h3>Position feed</h3>
              <div className="stream-grid">
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
                    <strong>
                      {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                    </strong>
                  ) : (
                    <strong>Acquiring GPS...</strong>
                  )}
                  {coords && <span className="subtle">{(coords.speed * 3.6).toFixed(1)} km/h</span>}
                </article>
              </div>
            </section>
          </div>
        </section>
      </div>

      {incomingRace && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <p className="eyebrow">Incoming race</p>
            <h3>Accept this challenge?</h3>
            <p className="modal-text">A nearby racer challenged you to a race.</p>

            <div className="modal-details">
              <span>From: {incomingRace.userData.user1}</span>
              <span>Race: {incomingRace.race.raceId}</span>
            </div>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => void sendRaceDecision(false, incomingRace.race.raceId)}>
                Deny
              </button>
              <button className="primary-btn" onClick={() => void sendRaceDecision(true, incomingRace.race.raceId)}>
                Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}