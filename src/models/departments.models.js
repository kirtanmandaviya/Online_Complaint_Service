// _id string pk
//   name string
//   headSupervisor ObjectId[] supervisors
//   headAdmin ObjectId[] admins
//   createdAt Date
//   updatedAt Date

import mongoose, { Schema } from "mongoose";

const departmentsSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            lowercase: true,
            trim: true,
            unique: true
        },
        supervisor:[{
            type: mongoose.Types.ObjectId,
            ref:"Supervisor",
        }],
        headAdmin: {
            type: mongoose.Types.ObjectId,
            ref: "Admin"
        },
        user:[{
            type: mongoose.Types.ObjectId,
            ref:"User"
        }]
    },
    { timestamps: true }
)

export const Department = mongoose.model("Department", departmentsSchema)