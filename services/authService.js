import jwt from 'jsonwebtoken';
import 'dotenv/config'
import fs from 'fs';
import path from 'path';

const privateKey = fs.readFileSync(path.resolve('private.key'), 'utf8');
const publicKey = fs.readFileSync(path.resolve('public.key'), 'utf8');

const verifyToken = (jwtToken) => {
    try {
        return jwt.verify(jwtToken, publicKey, { algorithm: ['RS256'] });
    }
    catch (err) {
        throw new Error("Invalid Token", err.message);
    }
}

const generateToken = (user) => {
    try {
        const payload = {
            id: user.id,
            name: user.name,
            email: user.email
        };
        const jwtToken = jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '1d' });

        return jwtToken;
    }
    catch (err) {
        throw new Error(`Error Generating token: ${err.message}`);
    }
}

export default { generateToken, verifyToken };