import bcrypt from "bcrypt" ;

const SALT_ROUNDS = 12 ;

export class Password {
    static async toHash(password : string) : Promise<string> {
        const hashedPassword = await bcrypt.hash(password , SALT_ROUNDS) ;
        return hashedPassword ;
    }

    static async toCompare (hashedPassword : string , password : string) : Promise<boolean> {
        const result = await bcrypt.compare(password , hashedPassword) ;
        return result ;
    }
}