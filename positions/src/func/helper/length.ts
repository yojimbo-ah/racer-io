export type PositionStamp = {
    longitude : number
    latitude : number 
    timestamp : string
}

const EARTH_RADIUS = 6371000; // meters

function toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
}

function haversineDistance(a: PositionStamp, b: PositionStamp): number {
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);

    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);

    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(dLon / 2) ** 2;

    return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

export function calculateSpeed(a: PositionStamp, b: PositionStamp): number {
    const distance = haversineDistance(a, b); // meters

    const timeSeconds =
        (Number(b.timestamp) - Number(a.timestamp)) / 1000;

    if (timeSeconds <= 0) {
        return 0;
    }

    return distance / timeSeconds; // meters/second
}