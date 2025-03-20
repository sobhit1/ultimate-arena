import argon2 from "argon2";
import userModel from "../models/userModel.js";
import authService from "../services/authService.js";

const register = async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const hashedPassword = await argon2.hash(password);
        const [result] = await userModel.addUser(name, email, hashedPassword);
        const user = { id: result.insertId, name, email };

        const jwtToken = authService.generateToken(user);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(201).json({ message: 'User registered successfully!', userId: result.insertId });
    }
    catch (err) {
        console.log(err);
        return res.status(500).json({ Error: 'Registration failed. Please try again.', Details: err.message });
    }
}

const login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const [user] = await userModel.findUser(email);

        if (!user.length) {
            return res.status(401).json({ Error: 'Invalid Credentials.' });
        }

        const isMatch = await argon2.verify(user[0].password, password);

        if (!isMatch) {
            return res.status(401).json({ Error: 'Invalid Credentials.' });
        }

        const jwtToken = authService.generateToken(user);

        res.cookie('token', jwtToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'Strict',
            maxAge: 24 * 60 * 60 * 1000
        });

        return res.status(200).json({ message: 'User logged in successfully!', user });
    }
    catch (err) {
        return res.status(500).json({ Error: 'Login failed. Please try again.', Details: err.message });
    }
}

export default { register, login };