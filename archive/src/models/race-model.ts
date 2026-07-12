import { RaceStatus } from "@racer-io/common";
import mongoose , {Document , Model} from "mongoose";

interface RaceAttrs  {
    users : string [] ,
    startPos : {
        longitude : number ,
        latitude : number
    } ,
    endingPos : {
        longitude : number ,
        latitude : number
    } ,
    winner ?: string ,
    _id : string ,
    raceStatus : RaceStatus
}
// interface that describes the proprityes that a User model has
interface RaceModel extends Model<RaceDocument> {
    build(attrs:RaceAttrs) : RaceDocument
}

// interface that describe the proprities that
// a User document has

interface RaceDocument extends Document {
    users : string [] ,
    startPos : {
        longitude : number ,
        latitude : number
    } ,
    endingPos : {
        longitude : number ,
        latitude : number
    } ,
    winner : string | undefined ,
    raceStatus : RaceStatus
}

const raceSchema = new mongoose.Schema({
    _id : {
        type : String ,
        required : true
    } ,
    users : {
        type : [String] ,
        required : true
    }
     ,
    startPos : {
        longitude : {
            type : Number ,
            required : true ,
            unique : false
        } ,
        latitude : {
            type : Number ,
            required : true ,
            unique : false
        }
    } ,
    endingPos : {
        longitude : {
            type : Number ,
            required : true ,
            unique : false
        } ,
        latitude : {
            type : Number ,
            required : true ,
            unique : false
        }
    } ,
    winner : {
        type : String ,
        required : false
    } ,
    raceStatus : {
        type : String ,
        enum : Object.values(RaceStatus) ,
        required : true ,
        default : RaceStatus.RaceAwaiting
    }
}, {
    toJSON: {
        transform (doc , ret : any) {
            ret.id = ret._id ;
            delete ret.__v ;
            delete ret._id ;
        }
    }
})



raceSchema.statics.build = (attrs : RaceAttrs) => {
    return new Race(attrs) ;
}

const Race = mongoose.model<RaceDocument , RaceModel>('Race' , raceSchema) ;
export default Race  ;