import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    username:{
        type:String,
        required:[true,"Username is required."],
        unique:[true,"Username Must be unique."]
    },
    email:{
        type:String,
        required:[true,"Username is required."],
        unique:[true,"Username Must be unique."]
    },
    password:{
        type:String,
        required:[true,"Username is required."]
    },
    verified:{
        type:Boolean,
        default:false
    }
})

export const userModel = mongoose.model('users',userSchema)