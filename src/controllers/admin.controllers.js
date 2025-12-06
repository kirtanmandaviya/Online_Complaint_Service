import { Admin } from '../models/admin.models.js';
import { User } from '../models/user.models.js';
import { Supervisor } from '../models/supervisor.models.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import jwt from 'jsonwebtoken';
import { Department } from '../models/departments.models.js';
import mongoose from 'mongoose';



const generateAccessAndRefreshToken =  async ( userId ) => {

    try {
        
        const user =  await Admin.findById(userId)

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

    const { userName, fullName, email, password, roleType } = req.body

    if( !userName || !fullName || !email || !password || !roleType ){
        throw new ApiError(401, "All credintials required!")
    }

    const userExistsInSupervisor = await Supervisor.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    const userExistsInUser = await User.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    const userExistsInAdmin = await Admin.findOne({ $or: [{ email: email.toLowerCase() }, { userName: userName.toLowerCase() }] });

    if (userExistsInSupervisor || userExistsInUser || userExistsInAdmin) {
        throw new ApiError(409, "User already exists");
    }

    if (!["main", "departmentAdmin"].includes(roleType)) {
    throw new ApiError(400, "Invalid roleType");
    }

    const user = await Admin.create(
        {
            fullName,
            userName: userName.toLowerCase(),
            email: email.toLowerCase(),
            password,
            roleType
        }
    )

    if( !user ){
        throw new ApiError(500, "Something went wrong while registering user!")
    }

    const createdUser = await Admin.findById(user._id).select( "-password -refreshToken" )

    if( !createdUser ){
        throw new ApiError(404, "User not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                createdUser,
                "User registered successfully"
            )
        )
})

const loginUser = asyncHandler( async( req, res ) => {

    const { userName, email, password } = req.body

    if( ( !userName && !email ) || !password ){
        throw new ApiError(401, "All credintials required!")
    }

    const emailLower = email?.toLowerCase();
    const userNameLower = userName?.toLowerCase();

    const user = await Admin.findOne({
        $or: [{ userName: userNameLower }, { email: emailLower }]
    });


    if( !user ){
        throw new ApiError(404, "User not found!")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if( !isPasswordValid ){
        throw new ApiError(401 , "Invalid password!")
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await Admin.findById(user._id).select( "-password -refreshToken" )

    
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
                { user : loggedInUser, accessToken, refreshToken},
                "User login successfully"
            )
        )

})

const logoutUser = asyncHandler( async( req, res ) => {

    if (!req.user || !req.user._id) {
        throw new ApiError(401, "Unauthorized");
    }

    await Admin.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                refreshToken: undefined
            }
        }
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

const refreshAccesssToken = asyncHandler( async( req, res ) => {

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken  

    if( !incomingRefreshToken ){
        throw new ApiError(401, "Refresh token is required!")
    }

  try {

        const decodeToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await Admin.findById(decodeToken._id)

        if( !user ){
            throw new ApiError(403, "User not found!")
        }

        if( incomingRefreshToken !== user?.refreshToken ){
            throw new ApiError(403, "Invalid refresh token!")
        }
  
        const { accessToken , refreshToken : newRefreshToken } = await generateAccessAndRefreshToken(user._id)
  
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
                    {
                        accessToken,
                        refreshToken: newRefreshToken
                    },
                    "Access token refresh successfully"
                )
            )
      
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token!")
  }

})

const updatePassword = asyncHandler( async( req, res ) => {

    const { oldPassword, newPassword } = req.body

    if( !oldPassword || !newPassword ){
        throw new ApiError(401, "Credintials required!")
    }

    const user = await Admin.findById(req.user?._id)

    if (!user) {
        throw new ApiError(404, "User not found!");
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword)

    if( !isPasswordValid ){
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

const updateAccountDetails = asyncHandler( async( req, res ) => {

    const { fullName, email, userName } = req.body

    if( !fullName && !email && !userName ){
        throw new ApiError(403, "Credintials required!")
    }

    if (userName) {
        const existingUser = await Admin.findOne({
            userName: userName.toLowerCase(),
            _id: { $ne: req.user._id },
        });
        if (existingUser) {
            throw new ApiError(409, "Username already taken");
        }
    }
        
    if (email) {
        const existingEmail = await Admin.findOne({
            email: email.toLowerCase(),
            _id: { $ne: req.user._id },
        });
        if (existingEmail) {
            throw new ApiError(409, "Email already taken");
        }
        }
        
        const updateFields = {};
        if (fullName) updateFields.fullName = fullName.toLowerCase();
        if (userName) updateFields.userName = userName.toLowerCase();
        if (email) updateFields.email = email.toLowerCase();
        

    const user = await Admin.findByIdAndUpdate(
        req.user._id,
        { $set: updateFields },
        { new : true }
    ).select( "-password -refreshToken" )

    if( !user ){
        throw new ApiError(404, "User not found!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                user,
                "Credintials update successfully"
            )
        )

})

const getCurrentUser = asyncHandler( async( req, res ) => {

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                req.user,
                "User data fetched successfully"
            )
        )

})

const assignDepartmentAdmin = asyncHandler( async ( req, res ) => {
    
    const { role, roleType } = req.user;
    const { department, adminId } = req.body;

    if( role !== "admin" || roleType !== "main" ){
        throw new ApiError(403, "Access denied!")
    }

    if( !department || !adminId ){
        throw new ApiError(400, "All credentials required!")
    }

    let foundDepartment;

    if( mongoose.Types.ObjectId.isValid(department) ){
        foundDepartment = await Department.findById(department)
    } else {
        foundDepartment = await Department.findOne( { name: department.toLowerCase() } )
    }

    if( !foundDepartment ){
        throw new ApiError(404, "Department not found!")
    }

    const adminDoc  = await Admin.findOne( { _id: adminId, roleType: "departmentAdmin" } )
    
    if( !adminDoc ){
        throw new ApiError(404, "Admin not found or not a department admin")
    }

    const existingAssignment  = await Department.findOne( { headAdmin: adminId } )

    if( existingAssignment && existingAssignment._id.toString() !== foundDepartment._id.toString() ){
        throw new ApiError(409, `Admin is already assigned as headAdmin to another department (${existingAssignment.name})`)
    }

    const assignAdmin = await Department.findByIdAndUpdate(
        foundDepartment._id,
        {
            $set: { headAdmin : adminDoc._id }
        },
        { new: true }
    )

    if( !assignAdmin ){
        throw new ApiError(403, "Something went wrong while assigning admin!")
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                assignAdmin,
                "Admin assign successfully"
            )
        )
})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccesssToken,
    updatePassword,
    updateAccountDetails,
    getCurrentUser,
    assignDepartmentAdmin
}