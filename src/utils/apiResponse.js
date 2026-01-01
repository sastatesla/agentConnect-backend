/**
 * Standardized API success response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data
    });
};

/**
 * Standardized API error response
 */
const errorResponse = (res, message = 'Error', statusCode = 500, error = null) => {
    const response = {
        success: false,
        message,
        ...(error && process.env.NODE_ENV !== 'production' && { error: error.stack || error })
    };
    return res.status(statusCode).json(response);
};

module.exports = {
    successResponse,
    errorResponse
};
