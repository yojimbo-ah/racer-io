// for now am using x and y coardinates to simolify the math 
// later it will be imroved to len and wed

import { RaceStatus } from "@racer-io/common";
import mongoose , {Document , Model} from "mongoose";


interface RaceAttrs  {
    user1 : string
    user2 : string
    startPos : {
        x : number ,
        y : number
    } ,
    endingPos : {
        x : number ,
        y : number
    }
}
// interface that describes the proprityes that a User model has
interface RaceModel extends Model<RaceDocument> {
    build(attrs:RaceAttrs) : RaceDocument
}

// interface that describe the proprities that
// a User document has

interface RaceDocument extends Document {
    user1 : string ;
    user2 : string ;
    startPos : {
        x : number ,
        y : number
    } ,
    endingPos : {
        x : number ,
        y : number
    } ,
    winner : string | undefined ,
    raceStatus : RaceStatus
}

const raceSchema = new mongoose.Schema({
    user1 : {
        type : String ,
        required : true ,
        unique : false
    } ,
    user2 : {
        type : String ,
        required : true ,
        unique : false
    } ,
    startPos : {
        x : {
            type : Number ,
            required : true ,
            unique : false
        } ,
        y : {
            type : Number ,
            required : true ,
            unique : false
        }
    } ,
    endingPos : {
        x : {
            type : Number ,
            required : true ,
            unique : false
        } ,
        y : {
            type : Number ,
            required : true ,
            unique : false
        }
    } ,
    winner : {
        type : String ,
        required : false
    } ,
    RaceStatus : {
        type : Object.values(RaceStatus) ,
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