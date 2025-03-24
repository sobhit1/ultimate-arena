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

async function getSolvedProblems(codeForcesID, ratingLowerLimit, ratingUpperLimit) {
    try {
        const submissionResponse = await fetch(`https://codeforces.com/api/user.status?handle=${codeForcesID}&from=1&count=1000000`);
        if (!submissionResponse.ok) {
            throw new Error(`Failed to fetch submissions for ${codeForcesID}: ${submissionResponse.status}`);
        }

        const submissions = await submissionResponse.json();
        const solvedProblems = new Set();

        submissions.result
            .filter((submission) =>
                submission.verdict === 'OK' &&
                submission.problem.rating >= ratingLowerLimit &&
                submission.problem.rating <= ratingUpperLimit
            )
            .forEach((prob) => solvedProblems.add(`${prob.problem.contestId}${prob.problem.index}`));

        return solvedProblems;
    }
    catch (err) {
        console.error(`Error fetching submissions for ${codeForcesID}:`, err);
        throw err;
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

        const solvedProblems = new Set();
        const [participants] = await contest.getParticipants(contestID);

        await Promise.all(participants.map(async (participant) => {
            try {
                const [codeForcesDetails] = await profile.getProfile(participant.userID);

                await Promise.all(codeForcesDetails.map(async (codeForcesUser) => {
                    try {
                        const solved = await getSolvedProblems(codeForcesUser.codeForcesID);
                        solved.forEach((prob) => solvedProblems.add(prob));
                    }
                    catch (err) {
                        console.error(`Error processing submissions for ${codeForcesUser.codeForcesID}:`, err);
                        throw err;
                    }
                }));
            }
            catch (err) {
                console.error(`Error processing participant ${participant.userID}:`, err);
            }
        }));

        const [contestProblems] = await contest.getProblems(contestID);
        contestProblems.forEach(prob => solvedProblems.add(`${prob.cfContestID}${prob.cfProblemNo}`));

        if (tags?.length) url += `?tags=${tags.join(';')};`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error fetching problems. Response status: ${response.status}`);
        }

        const { result: { problems: fetchedProblems } } = await response.json();

        const eligibleProblems = fetchedProblems.filter((prob) =>
            prob.rating >= ratingLowerLimit &&
            prob.rating <= ratingUpperLimit &&
            !solvedProblems.has(`${prob.contestId}${prob.index}`)
        );

        if (!eligibleProblems.length) {
            return res.status(404).json({ Error: 'No available problems matching criteria.' });
        }

        const selectedProblem = eligibleProblems[Math.floor(Math.random() * eligibleProblems.length)];
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

const checkIfSolved = async (req, res) => {
    const { cfContestID, cfProblemNo } = req.params;
    const userID = req.user.userID;

    try {
        const [codeForcesDetails] = await profile.getProfile(userID);

        for (const codeForcesUser of codeForcesDetails) {
            try {
                const submissionResponse = await fetch(
                    `https://codeforces.com/api/user.status?handle=${codeForcesUser.codeForcesID}&from=1&count=1000`
                );

                if (!submissionResponse.ok) {
                    throw new Error(
                        `Failed to fetch submissions for ${codeForcesUser.codeForcesID}: ${submissionResponse.status}`
                    );
                }

                const submissions = await submissionResponse.json();

                for (const submission of submissions.result) {
                    if (
                        submission.verdict === 'OK' &&
                        submission.problem.contestId == cfContestID &&
                        submission.problem.index == cfProblemNo
                    ) {
                        return res.status(200).json({
                            Status: 'Solved',
                            handle: codeForcesUser.codeForcesID,
                        });
                    }
                }
            }
            catch (err) {
                console.error(`Check Error with ${codeForcesUser.codeForcesID}:`, err.message);
            }
        }

        return res.status(200).json({
            Status: 'Unsolved',
            message: 'Problem not solved by any linked account',
        });
    }
    catch (err) {
        return res.status(500).json({
            Error: 'Some error occurred while checking.',
            Details: err.message,
        });
    }
};

export default { createContest, addParticipant, addProblem, checkIfSolved };