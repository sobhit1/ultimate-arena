import db from '../config/db.js';

const completeProfile = (userID, codeForcesID) => {
    return db.query(
        'INSERT INTO profile(userID,codeForcesID) VALUES(?,?)',
        [userID, codeForcesID]
    );
}

export default {completeProfile};