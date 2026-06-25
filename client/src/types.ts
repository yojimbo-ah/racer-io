/**
 * Position data snapshot - represents a racer's position and velocity
 */
export type PositionSnapshot = {
  x: number
  y: number
  vx: number
  vy: number
  speed: number
}

/**
 * Complete position event payload sent from client with additional metadata
 */
export type PositionEventPayload = PositionSnapshot & {
  heading: number
  timestamp: string
  source: 'client'
}
