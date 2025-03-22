import profile from "../models/profile.js";

const updateProfile = async (req, res) => {
    const userID = req.user.userID;
    const { codeForcesID } = req.body;
    try{
        const [result] = await profile.completeProfile(userID, codeForcesID);
        return res.status(200).json({ message: 'Profile updated in successfully!' });
    }
    catch(err){
        return res.status(500).json({ Error: 'Not able to complete Profile.', Details: err.message });
    }
}

export default { updateProfile };