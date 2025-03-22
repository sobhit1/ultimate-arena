import authService from "../services/authService.js";

const checkForAuthCookie = async (req, res, next) => {
    const token = req.cookies?.token;

    if (!token) {
        return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    try {
        const payload = authService.verifyToken(token);
        req.user = payload;
        return next();
    }
    catch (err) {
        res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'Strict' });
        return res.status(401).json({ message: "Invalid or expired token, please log in again." });
    }
};

export default checkForAuthCookie;