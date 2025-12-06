import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Supervisor } from "../models/supervisor.models.js";
import { User } from '../models/user.models.js';
import { Admin } from "../models/admin.models.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { Department } from "../models/departments.models.js";

const generateAccessAndRefreshToken =  async ( userId ) => {

    try {
        
        const user =  await Supervisor.findById(userId)

        if(!user){
            throw new ApiError(404, "User not found!")
        }

        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save( { validateBeforeSave : false } );

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while creating tokens!")
    }

}

const registerUser = asyncHandler( async ( req, res ) => {
    const { userName, password, email, fullName, department } = req.body

    if( !userName || !password || !email || !fullName || !department ){
        throw new ApiError(401, "All details required!")
    }

    const userExistsInSupervisor = await Supervisor.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    const userExistsInUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    const userExistsInAdmin = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    if (userExistsInSupervisor || userExistsInUser || userExistsInAdmin) {
        throw new ApiError(409, "User already exists");
    }

    let foundDepartment;

    if( mongoose.Types.ObjectId.isValid(department) ){
        foundDepartment = await Department.findById(department)
    } else {
        foundDepartment = await Department.findOne( { name: department.toLowerCase() })
    }

    if( !foundDepartment ){
        throw new ApiError(404, "Department not found!")
    }

    const user = await Supervisor.create(
        {
            fullName,
            userName: userName.toLowerCase(),
            password,
            email: email.toLowerCase(),
            department: foundDepartment._id
        }
    )

    if(!user){
        throw new ApiError(404, "Something went wrong while creating user!");
    }

     await Department.findByIdAndUpdate(
        foundDepartment._id,
        { $addToSet: { supervisor: user._id } }
    );

    const createdUser = await Supervisor.findById(user._id).select( " -password -refreshToken -permissions" );

    if(!createdUser){
        throw new ApiError(401, "user not found")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createdUser,
                "User created successfully"
            )
        )
})

const loginUser = asyncHandler(  async ( req, res ) => {

    const { email, userName, password } = req.body

    if( ( !email && !userName ) || !password ){
        throw new ApiError(401, "Credntails required!")
    }

    const emailLower = email?.toLowerCase();
    const userNameLower = userName?.toLowerCase();

    const user = await Supervisor.findOne({
        $or: [{ userName: userNameLower }, { email: emailLower }]
    });

    if( !user ){
        throw new ApiError(404, "User not found")
    }
    
    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, " Invalid password ")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)
    
    const loggedInUser = await Supervisor.findById(user._id).select( " -password -refreshToken -permissions" )

    if( !loggedInUser ){
        throw new ApiError(403, "User can't login!")
    }

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(
                200,
                { user: loggedInUser, accessToken, refreshToken },
                "User login successfully"
            )
        )
})

const logoutUser = asyncHandler( async ( req, res ) => {

    if (!req.user || !req.user._id) {
        throw new ApiError(401, "Unauthorized");
    }

    await Supervisor.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        { new: true }
    )

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production"
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(
                200,
                {},
                "User logout successfully"
            )
        )
})

const refreshAccesssToken = asyncHandler( async ( req, res ) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if( !incomingRefreshToken ){
        throw new ApiError(401, "RefreshToken is required!")
    }

    try {
        const decodeToken = jwt.verify(
                incomingRefreshToken,
                process.env.REFRESH_TOKEN_SECRET
        )

        const user = await Supervisor.findById(decodeToken._id)

        if( !user ){
            throw new ApiError(404, "User not found!")
        }

        console.log("incomingRefreshToken", incomingRefreshToken)
        console.log("user refreshtoken", user.refreshToken)


        if( incomingRefreshToken !== user?.refreshToken ){
            throw new ApiError(403, "Invalid refreshToken")
        }

        const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshToken(user._id)

        user.refreshToken = newRefreshToken;
        await user.save();

        const options = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production"
        }

        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newRefreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, 
                      refreshToken: newRefreshToken
                    },
                    "Access token refreshed successfully"
                )
            )
    } catch (error) {
        throw new ApiError(500, "Something went wrong while refreshing access token!")
    }
})

const updateAccountDetails = asyncHandler( async ( req, res ) => {

    const { fullName, userName, email, department } = req.body;
    const currentUser = await Supervisor.findById(req.user?._id).populate("department")

    if( !fullName && !userName && !email && !department){
        throw new ApiError(401, "Credintials not provided!")
    }

    if ( userName ) {
        const existingUser = await Supervisor.findOne({
            userName: userName.toLowerCase(),
            _id: { $ne: req.user._id },
        });
        if (existingUser) {
        throw new ApiError(409, "Username already taken");
        }
    }

    if ( email ) {
        const existingEmail = await Supervisor.findOne({
            email: email.toLowerCase(),
            _id: { $ne: req.user._id },
        });
        if ( existingEmail ) {
            throw new ApiError(409, "Email already taken");
        }
    }

    let updateDepartmentId = null;

    if( department ){
        let foundDepartment;

        if( mongoose.Types.ObjectId.isValid(department) ){
            foundDepartment = await Department.findById(department)
        } else {
            foundDepartment = await Department.findOne( { name: department.toLowerCase() } )
        }

        if( !foundDepartment ){
            throw new ApiError(404, "Department not found!")
        }

        if( currentUser.department && currentUser.department.name.toLowerCase() === foundDepartment.name.toLowerCase()  ){
            updateDepartmentId = null
        } else {
            updateDepartmentId = foundDepartment._id;

            if( currentUser.department ){
                await Department.findByIdAndUpdate(
                    currentUser.department._id,
                    { $pull: { supervisor: currentUser._id } }
                )
            }

            await Department.findByIdAndUpdate(
                foundDepartment._id,
                { $addToSet: { supervisor: currentUser._id } }
            )
        }
    }

    const updateFields = {};
    if ( fullName ) updateFields.fullName = fullName;
    if ( userName ) updateFields.userName = userName.toLowerCase();
    if ( email ) updateFields.email = email.toLowerCase();
    if( updateDepartmentId ) updateFields.department = updateDepartmentId

    const user = await Supervisor.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new : true }
    ).select( "-password -refreshToken -permissions" )

    if( !user ){
        throw new ApiError(404, "User not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Credintials updated successfully"
            )
        )
})

const getCurrentUser = asyncHandler( async ( req, res ) => {
   
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "User fetched successfully"
            )
        )
})

const updatePassword = asyncHandler( async ( req, res ) => {

    const { oldPassword, newPassword } = req.body

    if( !oldPassword || !newPassword){
        throw new ApiError(401, "Credintials required!")
    }

    const user = await Supervisor.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)
    
    if(!isPasswordValid){
        throw new ApiError(403, "Invalid password!")
    }

    user.password = newPassword
    await user.save( { validateBeforeSave: false } )

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "Password updated successfully"
            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesssToken,
    updateAccountDetails,
    getCurrentUser,
    updatePassword
}