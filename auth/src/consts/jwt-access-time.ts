export enum Expiration {
    refresh = "14d" ,
    access = "15m"
}

export enum ExpirationNum  {
    refresh = 14 * 24 * 60 * 60 * 1000 , // 14 days 
    access = 15 * 60 * 1000 // 15 minutes -- must stay in sync with Expiration.access
}

export enum ExpirationCookies {
    refreshTken = 'refreshToken' ,
    accessToken = 'accessToken'
}

// the refresh cookie is only needed by the three routes that read it:
// /api/refresh , /api/auth/logout and /api/auth/logoutall -- so /api is the
// narrowest path that still covers all of them
export const REFRESH_COOKIE_PATH = '/api' ;

// the access cookie is read by currentUser plus every downstream service
// (/api/races/* , /api/positions/*) so it has to be sent everywhere
export const ACCESS_COOKIE_PATH = '/' ;