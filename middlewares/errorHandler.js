import ApiError from "../utils/apiError.js";

const globalErrorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json(err.toJSON());
    }

    const unknownError = new ApiError(
        err.statusCode || 500,
        "Unexpected error occurred",
        [],
        err.stack
    );

    console.error("Unhandled Error:", {
        message: err.message,
        stack: err.stack,
        route: req.path,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    return res.status(500).json(unknownError.toJSON());
};

const RouteNotFoundHandler = (req, res, next) => {
    const error = new ApiError(404, `Route ${req.method} ${req.path} not found`);
    res.status(404).json(error.toJSON());
};

export default { globalErrorHandler, RouteNotFoundHandler };