// for now am using x and y coardinates to simolify the math 
// later it will be imroved to len and wed

import { RaceStatus } from "@racer-io/common";
import mongoose , {Document , Model} from "mongoose";


interface RaceAttrs  {
    user1 : string
    user2 : string
    startPos : {
        longitude : number ,
        latitude : number
    } ,
    endingPos : {
        longitude : number ,
        latitude : number
    }
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
    return new Race({
        users : [attrs.user1 , attrs.user2] , //user1 always position 1 and user 2 always position 2
        startPos : attrs.startPos ,
        endingPos : attrs.endingPos ,
    })
}

const Race = mongoose.model<RaceDocument , RaceModel>('Race' , raceSchema) ;
export default Race  ;