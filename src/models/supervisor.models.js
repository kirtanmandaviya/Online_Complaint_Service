// supervisors[icon:user-cog]{
//   _id string pk
//   name string 
//   email string
//   password string
//   department ObjectId[] departments 
//   createdAt Date
//   updatedAt Date
// }

import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const supervisorSchema = new Schema(
    {
        fullName:{
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            index: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim : true,
            lowercase: true,
            index: true
        },
        userName:{
            type: String,
            require: true,
            lowercase: true,
            trim: true,
            index: true
        },
        password: {
            type: String,
            required: [true, "Password is required"]
        },
        department:{
            type :Schema.Types.ObjectId,
            ref:"Department",
            required: true
        },
        refreshToken: {
            type: String
        },
        permissions: {
            type: [String],
            enum: ["closeComplaint", "escalateComplaint", "viewAssignedComplaints"], 
            default: []
        }
    },
    { timestamps: true }
)

supervisorSchema.pre("save", async function (next) {
    
    if(!this.isModified("password")) return next();
    
    this.password = await bcrypt.hash(this.password, 10)
    next()
})

supervisorSchema.methods.isPasswordCorrect = async function (password) {
    const result = await bcrypt.compare(password, this.password)
    return result
}

supervisorSchema.methods.generateAccessToken =  function () {
    return jwt.sign({
        _id : this._id,
        email: this.email,
        name: this.userName,
        role: "supervisor"
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    )
}

supervisorSchema.methods.generateRefreshToken = function () {
    return jwt.sign({
        _id: this._id
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    )
}

export const Supervisor = mongoose.model("Supervisor", supervisorSchema)