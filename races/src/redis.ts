import Redis from "ioredis";

// lazy connect let us either use the connection in testing enviroment or 
// the connection on the dev or the app enviroment 

const redis = new Redis({
    host : process.env.REDIS_HOST ,
    port : 6379 ,
    lazyConnect : true
})



export default redis ;