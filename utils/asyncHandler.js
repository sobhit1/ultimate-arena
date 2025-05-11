const asyncHandler = (fn, options = {}) => {
    if (typeof fn !== 'function') {
        throw new TypeError('asyncHandler requires a function argument');
    }

    const config = {
        timeout: options.timeout || process.env.ASYNC_HANDLER_TIMEOUT || 100000,
        enableErrorLog: options.enableErrorLog ?? process.env.NODE_ENV !== 'production',
        errorTransform: options.errorTransform || (error => error)
    };

    return async (req, res, next) => {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Request timed out after ${config.timeout}ms`));
                }, config.timeout).unref();
            });

            await Promise.race([
                fn(req, res, next),
                timeoutPromise
            ]);
        }
        catch (error) {
            const processedError = config.errorTransform(error);

            processedError.statusCode = processedError.statusCode || 500;

            if (!res.headersSent) {
                res.status(processedError.statusCode).json({
                    success: false,
                    message: processedError.message,
                    ...(process.env.NODE_ENV === 'development' && {
                        stack: processedError.stack,
                        originalError: error.message
                    })
                });
            }

            next(processedError);
        }
    };
};

export default asyncHandler;