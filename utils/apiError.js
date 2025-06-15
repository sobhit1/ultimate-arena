class ApiError extends Error {
    constructor(
        statusCode = 500,
        message = "Something went wrong",
        errors = [],
        stack = "",
        data = null
    ) {
        super(message);
        this.statusCode = statusCode;
        this.data = data;
        this.success = false;
        this.errors = errors;
        this.name = "ApiError";

        if (stack) {
            this.stack = stack;
        }
        else {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    addError(error) {
        this.errors.push(error);
        return this;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    toJSON() {
        return {
            success: this.success,
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            errors: this.errors,
            data: this.data,
            ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
        };
    }
}

export default ApiError;