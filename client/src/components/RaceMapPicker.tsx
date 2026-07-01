import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import './RaceMapPicker.css'
import type { GeoPoint } from '../types'

type RaceMapPickerProps = {
  value: GeoPoint | null
  onChange: (position: GeoPoint) => void
  fallbackCenter?: GeoPoint | null
}

const DEFAULT_CENTER: GeoPoint = {
  latitude: 0,
  longitude: 0,
}

const MapClickHandler = ({ onSelect }: { onSelect: (position: GeoPoint) => void }) => {
  useMapEvents({
    click(event) {
      onSelect({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      })
    },
  })

  return null
}

const MapSyncCenter = ({ center }: { center: GeoPoint }) => {
  const map = useMap()

  useEffect(() => {
    map.setView([center.latitude, center.longitude], map.getZoom(), { animate: true })
  }, [center.latitude, center.longitude, map])

  return null
}

export const RaceMapPicker = ({ value, onChange, fallbackCenter }: RaceMapPickerProps) => {
  const center = value ?? fallbackCenter ?? DEFAULT_CENTER
  const selectedLabel = value
    ? `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`
    : 'Click the map to place the finish line'

  return (
    <section className="map-picker-card">
      <div className="map-picker-head">
        <div>
          <p className="eyebrow">Finish line</p>
          <h4>Pick on the map</h4>
        </div>
        <p className="map-picker-copy">Use the map to set the ending position directly.</p>
      </div>

      <MapContainer center={[center.latitude, center.longitude]} zoom={13} scrollWheelZoom className="map-picker-canvas">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSyncCenter center={center} />
        <MapClickHandler onSelect={onChange} />
        {value && (
          <CircleMarker
            center={[value.latitude, value.longitude]}
            radius={10}
            pathOptions={{ color: '#ff4e50', fillColor: '#f9d423', fillOpacity: 0.85, weight: 3 }}
          />
        )}
      </MapContainer>

      <div className="map-picker-footer">
        <div>
          <span className="subtle">Selected finish position</span>
          <strong className="map-picker-coordinates">{selectedLabel}</strong>
        </div>
        <span className="subtle">No manual coordinate input needed</span>
      </div>
    </section>
  )
}