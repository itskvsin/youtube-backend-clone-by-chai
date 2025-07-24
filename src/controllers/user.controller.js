import { asyncHandler } from "../utils/asyncHandler.js";
import { apiError } from "../utils/apiErrors.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { apiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefereshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new apiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

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

  // console.log("Email : ", email);

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
  // const coverImagelocalPath = req.files?.coverImage[0]?.path;
  let coverImagelocalPath = "";
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImagelocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImagelocalPath);

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new apiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new apiResponse(200, createdUser, "User Registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get data from body
  //check if the data is valid || data is available
  //find the user
  //if not then send that the user is not there
  //check password
  //access and refresh token will be generated
  //send cookies
  //send response

  const { email, username, password } = req.body;

  if (!(username || email)) {
    throw new apiError(400, "username or email is required");
  }

  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new apiError(404, "User does not exist");
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new apiError(401, "Invalid User Credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefereshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //Before sending cookies we have to describe the options
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new apiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged In Successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  //Clear the cookie
  //clear the access and refresh token
  // User.findById()
  await User.findByIdAndUpdate(
    await req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new apiResponse(200, {}, "User Logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new apiError(401, "Unauthorized Request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new apiError(401, "Invalid Refresh Token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new apiError(401, "Refresh token is expired or used");
    }

    const option = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessAndRefereshToken(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, option)
      .cookie("refreshToken", newRefreshToken, option)
      .json(
        new apiResponse(
          200,
          { accessToken, newRefreshToken },
          "access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid Refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  // find the user
  //how do i bring the user
  //from the middleware auth.middleware and then find the user from that given ID

  const user = await User.findById(req.user?._id);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new apiError(400, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, {}, "password changed successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});

//update files from a seperate endpoint
//update account details from a seperate endpoint

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!(fullName || email)) {
    throw new apiError(400, "All Fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName,
        email,
      },
    },
    { new: true }
  ).select("-password");

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new apiResponse(200, user, "User Updated Successfully"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new apiError(400, "Avatar Image is missing");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new apiError(400, "Error while uploading on avatar");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res.status(200).json(200, user, "Avatar updated successfully");
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;

  if (!coverLocalPath) {
    throw new apiError(400, "Cover Image is Missing");
  }

  const coverImage = await uploadOnCloudinary(coverLocalPath);

  if (!coverImage.url) {
    throw new apiError(400, "Error while uploading the Cover Image");
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    { new: true }
  ).select("-password");

  return res.status(200).json(200, user, "Cover Image upadted Successfully");
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new apiError(400, "Username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },

    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $condition: {
            if: {
              $in: [req.user?._id, "$subscribers.subscriber"],
            },
            then: true,
            else: false,
          },
        },
      },
    },

    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  console.log(channel);

  if (!channel?.length) {
    throw new apiError(404, "Channel Does not exist");
  }

  return res
    .status(200)
    .json(
      new apiResponse(200, channel[0], "User channel fetched successfully")
    );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
};
