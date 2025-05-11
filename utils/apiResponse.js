class apiResponse {
    constructor(
        statusCode,
        data,
        message = "Success",
        pagination = null,
        meta = {}
    ) {
        this.statusCode = Number(statusCode);
        this.data = data;
        this.message = message;
        this.success = this.statusCode >= 200 && this.statusCode < 300;
        this.pagination = pagination;
        this.meta = meta;
        this.timestamp = new Date();
        this.name = "ApiResponse";
    }

    addPagination(page, limit, total) {
        this.pagination = {
            currentPage: page,
            pageLimit: limit,
            totalItems: total,
            totalPages: Math.ceil(total / limit)
        };
        return this;
    }

    setMeta(metaData) {
        this.meta = { ...this.meta, ...metaData };
        return this;
    }

    toJSON() {
        return {
            success: this.success,
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            data: this.data,
            ...(this.pagination && { pagination: this.pagination }),
            ...(Object.keys(this.meta).length > 0 && { meta: this.meta }),
            timestamp: this.timestamp.toISOString(),
            ...(process.env.NODE_ENV === 'development' && { stack: this.stack })
        };
    }
}

export default apiResponse;