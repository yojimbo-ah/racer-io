import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import './RacesPage.css'

type RacePoint = {
  longitude: number
  latitude: number
}

type RaceRecord = {
  id: string
  users: string[]
  startPos: RacePoint
  endingPos: RacePoint
  winner?: string
  RaceStatus?: string
  raceStatus?: string
}

const getApiUrl = () => {
  if (window.location.hostname === 'ticket.com') {
    return 'https://ticket.com'
  }
  return 'http://localhost:3000'
}

const formatPoint = (point: RacePoint) => `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`

export const RacesPage = () => {
  const { user, getToken } = useAuth()
  const [races, setRaces] = useState<RaceRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadRaces = async () => {
      try {
        setIsLoading(true)
        setError('')

        const response = await fetch(`${getApiUrl()}/api/races`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        })

        if (!response.ok) {
          throw new Error('Could not load your races')
        }

        const data = (await response.json()) as { races?: RaceRecord[] }
        setRaces(data.races ?? [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your races')
      } finally {
        setIsLoading(false)
      }
    }

    void loadRaces()
  }, [getToken])

  return (
    <div className="races-page">
      <header className="races-header">
        <div>
          <p className="races-eyebrow">Authenticated view</p>
          <h1>My races</h1>
          <p className="races-subtitle">View the races returned by the races service for {user?.email ?? 'your account'}.</p>
        </div>

        <div className="races-actions">
          <Link to="/" className="secondary-btn">
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="races-content">
        {isLoading && <div className="races-state">Loading your races...</div>}

        {!isLoading && error && <div className="races-state error">{error}</div>}

        {!isLoading && !error && races.length === 0 && (
          <div className="races-state">No races found for this account yet.</div>
        )}

        <section className="races-grid">
          {races.map((race) => {
            const status = race.RaceStatus ?? race.raceStatus ?? 'unknown'

            return (
              <article key={race.id} className="race-card">
                <div className="race-card-head">
                  <div>
                    <p className="race-card-label">Race ID</p>
                    <h2>{race.id}</h2>
                  </div>
                  <span className="race-status">{status}</span>
                </div>

                <dl className="race-meta">
                  <div>
                    <dt>Players</dt>
                    <dd>{race.users.join(' vs ')}</dd>
                  </div>
                  <div>
                    <dt>Winner</dt>
                    <dd>{race.winner ?? 'Not decided yet'}</dd>
                  </div>
                  <div>
                    <dt>Start</dt>
                    <dd>{formatPoint(race.startPos)}</dd>
                  </div>
                  <div>
                    <dt>Finish</dt>
                    <dd>{formatPoint(race.endingPos)}</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </section>
      </main>
    </div>
  )
}