import db from '../config/db.js';

const addUser = (name, user_name, password) => {
    return db.query(
        'INSERT INTO users(name,user_name,password) VALUES(?,?,?)',
        [name, user_name, password]
    );
}

const findUser = (user_name) => {
    return db.query(
        'SELECT * FROM users WHERE user_name=?',
        [user_name]
    );
}

export default { addUser, findUser };