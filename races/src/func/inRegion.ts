import { Position } from "@racer-io/common"


export const inRegion = (a : Position, b : Position, len : number) : boolean => {
    return Math.pow((Math.pow(a.longitude-b.longitude , 2) + Math.pow(a.latitude - b.latitude , 2)) , 0.5) < len ;
}