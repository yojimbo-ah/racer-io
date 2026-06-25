import { Position } from "@racer-io/common"


export const inRegion = (a : Position, b : Position, len : number) : boolean => {
    return Math.pow((Math.pow(a.x-b.x , 2) + Math.pow(a.y - b.y , 2)) , 0.5) < len ;
}