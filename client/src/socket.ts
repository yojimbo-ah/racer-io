import { io, type Socket } from 'socket.io-client'
import { type PositionSnapshot, type PositionEventPayload } from './types'
export type {PositionSnapshot , PositionEventPayload} ;

export const createPositionSocket = (serverUrl: string): Socket => {
  // Determine if we're connecting via relative path (ingress) or full URL
  const isRelativePath = serverUrl.startsWith('/')
  
    if (isRelativePath) {
    // For ingress paths, connect to current origin with socket.io path
    // Ingress routes /socket.io/ to positions service
    return io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      path: '/socket.io/',
      // ensure cookies are sent on the initial polling handshake
      transportOptions: {
        polling: {
          withCredentials: true,
        }
      },
      withCredentials: true,
    })
  } else {
    // For direct localhost connections
    return io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      transportOptions: {
        polling: {
          withCredentials: true,
        }
      },
      withCredentials: true,
    })
  }
}