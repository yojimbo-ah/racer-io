import mongoose , {Model , Document, mongo} from "mongoose";
import { timeStamp } from "node:console";

interface PositionAttrs {
    userId : string ,
    longitude : number ,
    latitude : number ,
    raceId : string ,
    timestamp : string
}

interface PositionModel extends Model<PositionDocument>{
    build(attrs:PositionAttrs) : PositionDocument
}

interface PositionDocument extends Document {
    longitude : number ,
    latitude : number ,
    timestamp : string ,
    raceId : string | undefined ,
    userId : string
}

const positionSchema = new mongoose.Schema({
    userId : {
        required : true ,
        type : String ,
        unique : false
    } ,
    longitude : {
        type : Number ,
        required : true
    } ,
    latitude : {
        type : Number ,
        required : true
    } ,
    raceId : {
        type : String ,
        required : false ,
        default : undefined ,
        unique : false
    } , 
    timestamp : {
        required : true ,
        type : String
    }
}) ;

positionSchema.statics.build =  (attrs : PositionAttrs) => {
    return new Position(attrs) ;
}

const Position = mongoose.model<PositionDocument,PositionModel>('Positions' , positionSchema) ;

export default Position ;