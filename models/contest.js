import db from '../config/db.js';

const addContest = (userID) => {
    return db.query(
        'INSERT INTO contests(userID) VALUES(?)',
        [userID]
    );
}

const getContest = (contestID) => {
    return db.query(
        'SELECT * FROM contests WHERE contestID=?',
        [contestID]
    );
}

const addParticipant = (contestID, userID) => {
    return db.query(
        'INSERT INTO participants(contestID, userID) VALUES(?,?)',
        [contestID, userID]
    );
}

const getParticipants = (contestID) => {
    return db.query(
        'SELECT * FROM participants WHERE contestID=?',
        [contestID]
    );
}

const addProblem = (contestID, cfContestID, cfProblemNo, userID = null, points = null) => {
    return db.query(
        'INSERT INTO contests_info(contestID, cfContestID, cfProblemNo, userID, points) VALUES(?,?,?,?,?)',
        [contestID, cfContestID, cfProblemNo, userID, points]
    );
}

const getProblems = (contestID) => {
    return db.query(
        'SELECT * FROM contests_info WHERE contestID=?',
        [contestID]
    );
}

export default { addContest, getContest, addParticipant, getParticipants, addProblem, getProblems };