import db from '../config/db.js';

const addUser = (name, email, password) => {
    return db.query(
        'INSERT INTO users(name,email,password) VALUES(?,?,?)',
        [name, email, password]
    );
}

const findUser = (email) => {
    return db.query(
        'SELECT * FROM users WHERE email=?',
        [email]
    );
}

export default { addUser, findUser };