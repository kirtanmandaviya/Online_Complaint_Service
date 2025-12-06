import jwt from 'jsonwebtoken';
import { User } from '../models/user.models.js';
import { Supervisor } from '../models/supervisor.models.js';
import { Admin } from '../models/admin.models.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const verifyJWT = asyncHandler( async ( req, res, next ) => {
    const token = req.cookies.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    if(!token){
        throw new ApiError(401, "Unauthorized")
    }

    try {
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        const { _id, role } = decodedToken;
        let user;

        if( role === "admin" ){
            user = await Admin.findById(_id).select( "-password -refreshToken" )
        }else if( role === "supervisor" ){
            user = await Supervisor.findById(_id).select( "-password -refreshToken" )
        }else if( role === "user" ){
            user = await User.findById(_id).select( "-password -refreshToken" )
        }

         if (!user) {
            throw new ApiError(401, "User not found");
        }

        req.user = {
            _id: user._id,
            roleType: role === "admin" ? user.roleType : undefined,
            role,
            name: user.name || user.userName,
            email: user.email
        };

        next();

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalide access token")
    }
})