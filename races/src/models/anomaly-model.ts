// this record will be created every time a new anamaly is detected 
// by the positions service

import mongoose , {Document , Model} from "mongoose";

interface AnomalyAttrs {
    userId : string ;
    reason : string ;
    timestamp : string ;
}

interface AnomalyDocument extends Document {
    reason : string ,
    timestamp : Date ,
}

interface AnomalyModel extends Model<AnomalyDocument> {
    build(attrs : AnomalyAttrs) : AnomalyDocument
}


const anomalySchema = new mongoose.Schema({
    userId : {
        type : String ,
        required : true
    } ,
    reason : {
        type : String ,
        required : true
    } ,
    timestamp : {
        type : Date ,
        required : true
    }
})

anomalySchema.statics.build = (attrs : AnomalyAttrs) => {
    return new Anomaly(attrs) ;
}

const Anomaly = mongoose.model<AnomalyDocument , AnomalyModel>('Anomaly' , anomalySchema) ;
export default Anomaly ;