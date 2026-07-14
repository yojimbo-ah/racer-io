import mongoose , {Document , Model} from "mongoose";

interface UserAttrs {
    userName : string ,
    email : string ,
    id : string
} ;

interface UserModel extends Model<UserDocument> {
    build(attrs : UserAttrs) : UserDocument
}

interface UserDocument extends Document {
    userName : string ,
    email : string ,
    anomaly : number
} ;
const userSchema = new mongoose.Schema({
    userName : {
        type : String ,
        required : true
    } ,
    email : {
        type : String ,
        required : String
    } ,
    _id : {
        type : String ,
        required : true ,
        ref : 'User'
    } ,
    anomaly : {
        type : Number ,
        default : 0 
    }
} ,  {
    toJSON: {
        transform (doc , ret : any) {
            ret.id = ret._id ;
            delete ret.__v ;
            delete ret._id ;
        }
    }
})

userSchema.statics.build = (attrs : UserAttrs) => {
    return new User({
        _id : attrs.id ,
        userName : attrs.userName ,
        email : attrs.email
    })
}

const User = mongoose.model<UserDocument , UserModel>('User' , userSchema) ;
export default User  ;