import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //take data from the body req.body
  //and check if the data is correct or not || available or not // Validation
  //check if user exists : username , email
  //check for images , check for avatar
  //upload them to cloudinary , check avatar
  //create user object - create entry in DB
  //remove password and refreshToken field
  //check for user creation
  //return res

  const { fullName, username, email, password } = req.body;

  console.log("Email : ", email);

  if (
    [fullName, username, email, password].some((field) => field.trim() === "")
  ) {
    throw new apiError(400, "Field Missing");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new apiError(409, "User with email or username already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImagelocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImagelocalPath);

  if (!avatar) {
    throw new apiError(400, "Avatar is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  const createdUser = await user.findById(user._id).select(
    "-password -refreshToken"
  )

  if(!createdUser){
    throw new apiError(500 , "Something went wrong while registering the user")
  }

  return res.status(201).json(
    new apiResponse(200,createdUser,"User Registered Successfully")
  )

});

export { registerUser };
