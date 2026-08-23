import mongoose , {Document , Model, mongo} from "mongoose";

interface UserAttr {
    _id : string ,
    email : string ,
    username : string
}

interface UserDocument extends Document {
    email : string ,
    username : string ,
}

interface UserModel extends Model<UserDocument> {
    build(attrs: UserAttr) : UserDocument
}

const userSchema = new mongoose.Schema({
    username : {
        type : String ,
        unique : true
    } ,
    email : {
        type : String ,
        unique : true
    }
} , {
    timestamps : true
})

userSchema.statics.build = (attrs : UserAttr) => {
    return new User(attrs) ;
}

export const User = mongoose.model<UserDocument , UserModel>('User' , userSchema) ;