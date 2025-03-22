import argon2 from "argon2";
import userModel from "../models/userModel.js";
import authService from "../services/authService.js";

const register = async (req, res) => {
    const { name, user_name, password } = req.body;
    
    if (!name?.trim() || !user_name?.trim() || !password?.trim()) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await argon2.hash(password);
        const [result] = await userModel.addUser(name, user_name, hashedPassword);
        const user = { userID: result.insertId, name, user_name };

        const jwtToken = authService.generateToken(user);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ message: 'User registered successfully!', userID: result.insertId, userName: name, user_name: user_name });
    }
    catch (err) {
        return res.status(500).json({ Error: 'Registration failed. Please try again.', Details: err.message });
    }
}

const login = async (req, res) => {
    const { user_name, password } = req.body;

    if (!user_name || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [user] = await userModel.findUser(user_name);

        if (!user.length) {
            return res.status(401).json({ Error: 'Invalid Credentials.' });
        }

        const isMatch = await argon2.verify(user[0].password, password);

        if (!isMatch) {
            return res.status(401).json({ Error: 'Invalid Credentials.' });
        }
        
        const jwtToken = authService.generateToken(user[0]);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ message: 'User logged in successfully!', userID: user[0].userID, userName: user[0].name, user_name: user[0].user_name });
    }
    catch (err) {
        return res.status(500).json({ Error: 'Login failed. Please try again.', Details: err.message });
    }
}

export default { register, login };