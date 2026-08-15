export enum Expiration {
    refresh = "14d" ,
    access = "15m"
}

export enum ExpirationNum  {
    refresh = 14 * 24 * 60 * 60 * 1000 , // 14 days 
    access = 15 * 60 * 60 * 1000 
}