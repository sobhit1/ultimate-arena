import argon2 from "argon2";
import authService from "../services/authService.js";
import ApiError from "../utils/apiError.js";
import ApiResponse from "../utils/apiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import prisma from "../config/prisma.js";

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None"
};

const generateAccessAndRefreshTokens = async (user) => {
  try {
    const accessToken = authService.generateAccessToken(user);
    const refreshToken = authService.generateRefreshToken(user);

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken },
    });

    return { accessToken, refreshToken };
  } catch (err) {
    console.error("Error generating tokens:", err);
    throw new ApiError(500, "Failed to generate tokens");
  }
};

const register = asyncHandler(async (req, res) => {
  const { name, user_name, password } = req.body;

  if (!name?.trim() || !user_name?.trim() || !password?.trim()) {
    throw new ApiError(400, "All fields are required.");
  }

  const existingUser = await prisma.user.findUnique({
    where: { user_name },
  });

  if (existingUser) {
    throw new ApiError(400, "User already exists.");
  }

  const hashedPassword = await argon2.hash(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      user_name,
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      user_name: true,
    },
  });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(newUser);

  return res
    .status(201)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(201, { newUser }, "User registered successfully!")
    );
});

const login = asyncHandler(async (req, res) => {
  const { user_name, password } = req.body;

  if (!user_name?.trim() || !password?.trim()) {
    throw new ApiError(400, "All fields are required.");
  }

  const user = await prisma.user.findUnique({ where: { user_name } });

  if (!user) {
    throw new ApiError(404, "User not found.");
  }

  const isMatch = await argon2.verify(user.password, password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid credentials.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: { id: user.id, name: user.name, user_name: user.user_name } },
        "User logged in successfully!"
      )
    );
});

const logout = asyncHandler(async (req, res) => {
  const token =
    req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(400, "No token provided for logout.");
  }

  const payload = authService.verifyToken(token);

  await prisma.user.update({
    where: { id: payload?.id },
    data: { refreshToken: null },
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request. Refresh token missing.");
  }

  try {
    const payload = authService.verifyToken(incomingRefreshToken);

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      throw new ApiError(401, "User not found.");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Invalid or expired refresh token.");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user);

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", refreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken },
          "Tokens refreshed successfully."
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export default {
  register,
  login,
  logout,
  refreshAccessToken,
};