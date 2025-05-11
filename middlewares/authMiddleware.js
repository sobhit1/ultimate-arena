import authService from "../services/authService.js";
import apiError from '../utils/apiError.js';
import asyncHandler from '../utils/asyncHandler.js';

const checkForAuthCookie = asyncHandler(
    async (req, _, next) => {
        try {
            const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");

            if (!token) {
                throw new apiError(401, "Unauthorized Access");
            }

            const payload = authService.verifyToken(token);
            req.user = payload;
            return next();
        }
        catch (err) {
            throw new apiError(401, err?.message || "Invalid access token");
        }
    }
);

export default checkForAuthCookie;