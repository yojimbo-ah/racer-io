import mongoose , {Document , Model} from "mongoose";
import { Password } from "../services/password";
// the interface describes the shape of data that we need to create 
// a new User
interface UserAttrs  {
    email : string
    password : string
}
// interface that describes the proprityes that a User model has
interface UserModel extends Model<UserDocument> {
    build(attrs:UserAttrs) : UserDocument
}

// interface that describe the proprities that
// a User document has

interface UserDocument extends Document {
    email : string ;
    password : string ;
}

const userSchema = new mongoose.Schema({
    email : {
        type : String ,
        required : true ,
        unique : true
    } ,
    password : {
        type : String ,
        required : true ,
    }
}, {
    toJSON: {
        transform (doc , ret : any) {
            ret.id = ret._id ;
            delete ret.__v ;
            delete ret.password ;
            delete ret._id ;
        }
    }
})

userSchema.pre('save' , async function () {
    if (this.isModified('password')) {
        const hashedPassword = await Password.toHash(this.password) ;
        this.password = hashedPassword ;
    }
})

userSchema.statics.build = (attrs : UserAttrs) => {
    return new User(attrs) ;
}

const User = mongoose.model<UserDocument , UserModel>('User' , userSchema) ;
export default User  ;