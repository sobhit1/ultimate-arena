import contest from "../models/contest.js";
import profile from "../models/profile.js";
import userModel from "../models/userModel.js";

const createContest = async (req, res) => {
    const userID = req.user.userID;

    try {
        const [result] = await contest.addContest(userID);
        const contestID = result.insertId;

        return res.status(200).json({ 
            message: 'Contest created successfully!', 
            contestID: contestID 
        });
    } 
    catch (err) {
        return res.status(500).json({ 
            Error: 'Not able to Create contest.', 
            Details: err.message 
        });
    }
}

const addParticipant = async (req, res) => {
    const contestID = req.params.contestID;
    const { user_name } = req.body;

    try {
        const [contestExists] = await contest.getContest(contestID);
        if (!contestExists.length) {
            return res.status(404).json({ Error: 'Contest not found.' });
        }

        const [user] = await userModel.findUser(user_name);
        if (!user.length) {
            return res.status(401).json({ Error: 'Invalid user name.' });
        }

        const userID = user[0].userID;
        await contest.addParticipant(contestID, userID);

        return res.status(200).json({ message: 'Participant added successfully!' });
    } 
    catch (err) {
        return res.status(500).json({ 
            Error: 'Not able to add participant.', 
            Details: err.message 
        });
    }
}

const addProblem = async (req, res) => {
    const contestID = req.params.contestID;
    const { tags, ratingLowerLimit: rLL, ratingUpperLimit: rUL, points: pts } = req.body;

    const ratingLowerLimit = parseInt(rLL, 10);
    const ratingUpperLimit = parseInt(rUL, 10);
    const points = parseInt(pts, 10);

    if (isNaN(ratingLowerLimit) || isNaN(ratingUpperLimit) || isNaN(points)) {
        return res.status(400).json({ 
            Error: 'Invalid rating limits or points. They must be integers.' 
        });
    }

    if (ratingLowerLimit > ratingUpperLimit) {
        return res.status(400).json({ 
            Error: 'ratingLowerLimit must be less than or equal to ratingUpperLimit.' 
        });
    }

    let url = `https://codeforces.com/api/problemset.problems`;

    try {
        const [contestExists] = await contest.getContest(contestID);
        if (!contestExists.length) {
            return res.status(404).json({ Error: 'Contest not found.' });
        }

        let solvedProblems = new Set();
        const [participants] = await contest.getParticipants(contestID);

        await Promise.all(participants.map(async (participant) => {
            const [codeForcesDetails] = await profile.getProfile(participant.userID);

            await Promise.all(codeForcesDetails.map(async (codeForcesUser) => {
                try {
                    const submissionResponse = await fetch(`https://codeforces.com/api/user.status?handle=${codeForcesUser.codeForcesID}&from=1&count=1000000000`);
                    if (!submissionResponse.ok) {
                        throw new Error(`Failed to fetch submissions for ${codeForcesUser.codeForcesID}: ${submissionResponse.status}`);
                    }
                    
                    const submissions = await submissionResponse.json();
                    
                    submissions.result
                        .filter((submission) => 
                            submission.verdict === 'OK' && 
                            submission.problem.rating >= ratingLowerLimit && 
                            submission.problem.rating >= ratingUpperLimit
                        )
                        .forEach((prob) => solvedProblems.add(`${prob.problem.contestId}${prob.problem.index}`));
                } 
                catch (err) {
                    console.error(`Error processing submissions for ${codeForcesUser.codeForcesID}:`, err);
                    throw err;
                }
            }));
        }));

        const [contestProblems] = await contest.getProblems(contestID);
        contestProblems.forEach(prob => solvedProblems.add(`${prob.cfContestID}${prob.cfProblemNo}`));

        if (tags?.length) url += `?tags=${tags.join(';')};`;

        const response = await fetch(url);
        if (!response.ok) 
            throw new Error(`Error fetching problems. Response status: ${response.status}`);

        const { result: { problems: fetchedProblems } } = await response.json();

        const eligibleProblems = fetchedProblems.filter((prob) => 
            prob.rating >= ratingLowerLimit && 
            prob.rating <= ratingUpperLimit && 
            !solvedProblems.has(`${prob.contestId}${prob.index}`)
        );

        if (!eligibleProblems.length) {
            return res.status(404).json({ Error: 'No available problems matching criteria.' });
        }

        const selectedProblem = eligibleProblems[0];
        await contest.addProblem(contestID, selectedProblem.contestId, selectedProblem.index, null, points);

        return res.status(200).json({ 
            message: 'Problem added successfully!', 
            Problem: selectedProblem 
        });
    } 
    catch (err) {
        return res.status(500).json({ 
            Error: 'Not able to add Problem.', 
            Details: err.message 
        });
    }
}

export default { createContest, addParticipant, addProblem };