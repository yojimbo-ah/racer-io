export type PositionStamp = {
    x : number
    y : number 
    timestamp : string
}

export const speedX = (a : PositionStamp , b : PositionStamp ) : number => {
    const t1 = new Date(a.timestamp).getTime() ;
    const t2 = new Date(b.timestamp).getTime() ;
    const t = Math.abs((t1 - t2) / 1000) ;
    return Math.abs(a.x - b.x) / t ;
}
export const speedY = (a : PositionStamp , b : PositionStamp ) : number => {
    const t1 = new Date(a.timestamp).getTime() ;
    const t2 = new Date(b.timestamp).getTime() ;
    const t = Math.abs((t1 - t2) / 1000) ;
    return Math.abs(a.y - b.y) / t ;
}


export const speedTwoAxes = (a : PositionStamp , b : PositionStamp) : number => {
    const t1 = new Date(a.timestamp).getTime() ;
    const t2 = new Date(b.timestamp).getTime() ;
    const t = Math.abs((t1 - t2) / 1000) ;

    return Math.pow(Math.pow(a.x - b.x , 2) + Math.pow(a.y = b.y , 2) , 0.5) / t ;
}