import profile from "../models/profile.js";

const updateProfile = async (req, res) => {
    const userID = req.user.userID;
    const { codeForcesID } = req.body;
    const url = `https://codeforces.com/api/user.info?handles=${codeForcesID}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Invalid CodeForces Username: ${codeForcesID}`);
        }

        await profile.completeProfile(userID, codeForcesID);

        return res.status(200).json({ 
            message: 'Profile updated successfully!' 
        });
    } 
    catch (err) {
        return res.status(500).json({ 
            Error: 'Not able to complete profile.', 
            Details: err.message 
        });
    }
}

export default { updateProfile };