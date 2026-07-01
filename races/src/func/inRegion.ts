import { Position } from "@racer-io/common"

const EARTH_RADIUS = 6371000; // meters

const toRadians = (degrees: number): number => degrees * Math.PI / 180;

export const distanceBetween = (a: Position, b: Position): number => {
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);

    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);

    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);

    const hav =
        sinLat * sinLat +
        Math.cos(lat1) *
            Math.cos(lat2) *
            sinLon *
            sinLon;

    const c = 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav));

    return EARTH_RADIUS * c;
};

export const inRegion = (
    a: Position,
    b: Position,
    radius: number
): boolean => {
    return distanceBetween(a, b) < radius;
};