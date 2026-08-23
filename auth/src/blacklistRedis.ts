import { BlacklistClient } from "@racer-io/common";

const blacklistRedis = new BlacklistClient(process.env.REDIS_HOST_BLACKLIST!) ;

export default blacklistRedis ;