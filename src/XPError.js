class XPError extends Error {
    constructor(message){
        super();
        Error.captureStackTrace(this, this.constructor);
        this.name = 'XPError';
        this.message = message;
    }
}

module.exports = XPError;