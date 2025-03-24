import db from '../config/db.js';

const completeProfile = (userID, codeForcesID) => {
    return db.query(
        'INSERT INTO profile(userID,codeForcesID) VALUES(?,?)',
        [userID, codeForcesID]
    );
}

const getProfile = (userID) => {
    return db.query(
        'SELECT * FROM profile WHERE userID=?',
        [userID]
    );
}

export default { completeProfile, getProfile };