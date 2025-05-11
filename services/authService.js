import jwt from 'jsonwebtoken';
import 'dotenv/config'
import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.resolve('private.key'), 'utf8');
const publicKey = fs.readFileSync(path.resolve('public.key'), 'utf8');

const verifyToken = (jwtToken) => {
    try {
        return jwt.verify(jwtToken, publicKey, { algorithms: ['RS256'] });
    }
    catch (err) {
        throw new Error(`Invalid or Expired Refresh Token: ${err.message}`);
    }
}

const generateAccessToken = (user) => {
    try {
        const payload = {
            id: user.id,
            name: user.name,
            user_name: user.user_name
        };
        const AccessToken = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: process.env.ACCESS_TOKEN_EXPIRY });
        return AccessToken;
    }
    catch (err) {
        throw new Error(`Error generating Access token: ${err.message}`);
    }
}

const generateRefreshToken = (user) => {
    try {
        const payload = {
            id: user.id,
            name: user.name,
            user_name: user.user_name
        };
        const RefreshToken = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: process.env.REFRESH_TOKEN_EXPIRY });
        return RefreshToken;
    }
    catch (err) {
        throw new Error(`Error generating Refresh token: ${err.message}`);
    }
}

export default { verifyToken, generateAccessToken, generateRefreshToken };