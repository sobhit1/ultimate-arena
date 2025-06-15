import ApiError from '../utils/apiError.js';
import ApiResponse from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';
import prisma from '../config/prisma.js';

const createContest = asyncHandler(
    async (req, res) => {
        const id = req.user.id;
        const { startAt } = req.body;

        const istDate = new Date(startAt);
        const utcDate = new Date(istDate.toISOString());

        const contest = await prisma.contest.create({
            data: {
                createdBy: id,
                startAt: utcDate
            }
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { contest },
                    "Contest created successfully!"
                )
            )
    }
);

const addParticipant = asyncHandler(
    async (req, res) => {
        const contestID = parseInt(req.params.contestID);
        const { user_name } = req.body;

        const contestExists = await prisma.contest.findUnique({
            where: {
                id: contestID
            }
        });
        if (!contestExists) {
            throw new ApiError(404, "Contest not found.");
        }

        const user = await prisma.user.findUnique({
            where: { user_name }
        });
        if (!user) {
            throw new ApiError(401, "Invalid user name.");
        }

        const participant = await prisma.participant.create({
            data: {
                userId: user.id,
                contestId: contestID
            }
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { participant },
                    "Participant added successfully!"
                )
            )
    }
);

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

const addProblem = asyncHandler(
    async (req, res) => {
        const contestID = parseInt(req.params.contestID);
        const { tags, ratingLowerLimit: rLL, ratingUpperLimit: rUL, points: pts } = req.body;

        const ratingLowerLimit = parseInt(rLL, 10);
        const ratingUpperLimit = parseInt(rUL, 10);
        const points = parseInt(pts, 10);

        if (isNaN(ratingLowerLimit) || isNaN(ratingUpperLimit) || isNaN(points)) {
            throw new ApiError(400, "Invalid rating limits or points. They must be integers.");
        }

        if (ratingLowerLimit > ratingUpperLimit) {
            throw new ApiError(400, "ratingLowerLimit must be less than or equal to ratingUpperLimit.");
        }

        let url = `https://codeforces.com/api/problemset.problems`;

        const contestExists = await prisma.contest.findUnique({
            where: {
                id: contestID
            }
        });
        if (!contestExists) {
            throw new ApiError(404, "Contest not found.");
        }

        const solvedProblems = new Set();
        const participants = await prisma.participant.findMany({
            where: {
                contestId: contestID
            }
        });

        await Promise.all(participants.map(async (participant) => {
            try {
                const codeForcesDetails = await prisma.codeForcesID.findMany({
                    where: {
                        userId: participant.id
                    }
                });

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
                console.error(`Error processing participant ${participant.id}:`, err);
                throw err;
            }
        }));

        const contestProblems = await prisma.problem.findMany({
            where: {
                contestId: contestID
            }
        });
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
            throw new ApiError(404, "No available problems matching criteria.");
        }

        const selectedProblem = eligibleProblems[Math.floor(Math.random() * eligibleProblems.length)];
        const addedProblem = await prisma.problem.create({
            data: {
                cfContestID: selectedProblem.contestId,
                cfProblemIdx: selectedProblem.index,
                points,
                contestId: contestID
            }
        });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    { addedProblem },
                    "Problem added successfully!"
                )
            )
    }
);

const checkIfSolved = asyncHandler(
    async (req, res) => {
        const problemID = parseInt(req.params.problemID);
        const id = req.user.id;

        const codeForcesDetails = await prisma.codeForcesID.findMany({
            where: {
                userId: id
            }
        });

        const problem = await prisma.problem.findUnique({
            where: {
                id: problemID
            }
        });

        for (const codeForcesUser of codeForcesDetails) {
            try {
                const submissionResponse = await fetch(
                    `https://codeforces.com/api/user.status?handle=${codeForcesUser.codeForcesID}&from=1&count=1000`
                );

                if (!submissionResponse.ok) {
                    throw new Error(`Failed to fetch submissions for ${codeForcesUser.codeForcesID}: ${submissionResponse.status}`);
                }

                const submissions = await submissionResponse.json();

                for (const submission of submissions.result) {
                    if (
                        submission.verdict === 'OK' &&
                        submission.problem.contestId == problem.cfContestID &&
                        submission.problem.index == problem.cfProblemIdx
                    ) {

                        const updatedProblem = await prisma.problem.update({
                            where: {
                                id: parseInt(problemID),
                            },
                            data: {
                                solvedBy: id
                            }
                        });

                        return res
                            .status(200)
                            .json(
                                new ApiResponse(
                                    200,
                                    { updatedProblem },
                                    `Problem solved by ${codeForcesUser.codeForcesID}`
                                )
                            )
                    }
                }
            }
            catch (err) {
                console.error(`Check Error with ${codeForcesUser.codeForcesID}:`, err.message);
                throw err;
            }
        }

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    { problem },
                    "Problem not solved by any linked account."
                )
            )
    }
);

export default { createContest, addParticipant, addProblem, checkIfSolved };