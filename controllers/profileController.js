import apiError from '../utils/apiError.js';
import apiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

const updateProfile = asyncHandler(
    async (req, res) => {
        const id = req.user.id;
        const { codeForcesID } = req.body;
        const url = `https://codeforces.com/api/user.info?handles=${codeForcesID}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new apiError(400, `Invalid CodeForces Username: ${codeForcesID}`);
        }

        const profile = await prisma.codeForcesID.create({
            data: {
                codeForcesID,
                userId: id
            }
        });

        return res
            .status(200)
            .json(
                new apiResponse(
                    200,
                    { profile },
                    "Profile updated successfully!"
                )
            )
    }
);

export default { updateProfile };