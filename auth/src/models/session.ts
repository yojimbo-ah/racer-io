import mongoose , {Model , Document} from "mongoose";
import { Password } from "../services/password";

interface SessionAttrs  {
    userId : string ,
    hashSession : string ,
    ip ?: string ,
    expiresAt : Date ,
    userAgent ?: string
}

interface SessionDocument extends Document {
    userId : string ,
    hashSession : string ,
    ip ?: string ,
    userAgent ?: string ,
    createdAt : Date ,
    expiresAt : Date ,
    updatedAt : Date
}

interface SessionModel extends Model<SessionDocument> {
    build(attrs : SessionAttrs) : SessionDocument ;
}


const sessionSchema =  new mongoose.Schema({
    userId : {
        type : String ,
        required : true ,
        unique : true
    } ,
    hashSession : {
        type : String ,
        required : true ,
        unique : true
    } ,
    ip : {
        type : String ,
        required : false 
    } ,
    userAgent : {
        type : String , 
        required : false
    } ,
    createdAt : {
        type : Date ,
        default : Date.now
    } ,
    expiresAt: {
        type: Date,
        required: true,
        index: { expireAfterSeconds: 0 } 
    } ,
    updatedAt : {
        type : Date ,
        default : Date.now
    }
})
sessionSchema.pre('save' , async function () {
    if (this.isModified('password')) {
        const hashedSession = await Password.toHash(this.hashSession) ;
        this.hashSession = hashedSession ;
    }
})


sessionSchema.statics.build = (attrs : SessionAttrs) => {
    return new Session(attrs) ; 
}

const Session = mongoose.model<SessionDocument , SessionModel>('Session' , sessionSchema) ;
export default Session ;