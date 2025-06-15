import argon2 from "argon2";
import authService from "../services/authService.js";
import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

const generateAccessAndRefereshTokens = async (user) => {
    try {
        const accessToken = authService.generateAccessToken(user);
        const refreshToken = authService.generateRefreshToken(user);

        await prisma.user.update({
            where: {
                id: user.id,
            },
            data: {
                refreshToken: refreshToken,
            }
        });

        return { accessToken, refreshToken };
    }
    catch (err) {
        console.error("Error generating access and refresh tokens:", err);
        throw new ApiError(500, "Something went wrong while generating referesh and access token");
    }
}

const register = asyncHandler(
    async (req, res) => {
        const { name, user_name, password } = req.body;

        if (!name?.trim() || !user_name?.trim() || !password?.trim()) {
            throw new ApiError(400, "All fields are Required.");
        }

        const existingUser = await prisma.user.findUnique({
            where: { user_name: user_name }
        });

        if (existingUser) {
            throw new ApiError(400, "User with this email already exists.");
        }

        const hashedPassword = await argon2.hash(password);

        const newUser = await prisma.user.create({
            data: {
                name: name,
                user_name: user_name,
                password: hashedPassword
            },
            select: {
                id: true,
                name: true,
                user_name: true
            }
        });

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(newUser);

        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(201)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    201,
                    { newUser },
                    "User registered successfully!"
                )
            )
    }
);

const login = asyncHandler(
    async (req, res) => {
        const { user_name, password } = req.body;

        if (!user_name?.trim() || !password?.trim()) {
            throw new ApiError(400, "All fields are Required.");
        }

        const user = await prisma.user.findUnique({
            where: { user_name }
        });

        if (!user) {
            throw new ApiError(404, "User not found.");
        }

        const isMatch = await argon2.verify(user.password, password);

        if (!isMatch) {
            throw new ApiError(401, "Invalid Credentials.");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user);

        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { user: { id: user.id, name: user.name, user_name: user.user_name } },
                    "User logged successfully!"
                )
            )
    }
);

const logout = asyncHandler(async (req, res) => {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
        throw new ApiError(400, "No token found for logout");
    }

    const payload = authService.verifyToken(token);

    await prisma.user.update({
        where: { id: payload?.id },
        data: { refreshToken: null }
    });

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User logged Out"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request");
    }

    try {
        const payload = authService.verifyToken(incomingRefreshToken);

        const user = await prisma.user.findUnique({
            where: {
                id: payload.id
            }
        });

        if (!user) {
            throw new ApiError(401, "Invalid refresh token");
        }

        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used");
        }

        const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(user);
        

        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", refreshToken, options)
            .json(
                new ApiResponse(
                    200,
                    { accessToken, refreshToken },
                    "Access and Refresh token refreshed"
                )
            )
    }
    catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});

export default { register, login, logout, refreshAccessToken };