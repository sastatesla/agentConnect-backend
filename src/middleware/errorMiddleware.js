const { errorResponse } = require('../utils/apiResponse');

const errorMiddleware = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    // Log error for developers
    if (process.env.NODE_ENV !== 'production') {
        console.error('ERROR:', err);
    }

    errorResponse(res, err.message, err.statusCode, err);
};

const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next);
    };
};

module.exports = {
    errorMiddleware,
    catchAsync
};
