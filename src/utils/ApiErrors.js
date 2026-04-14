//stack-> err kaha hua uska full path
class ApiErrors extends Error {
    constructor(statuscode, message = "somthing ewent wrong", stack = " ", errors = []) {
        super(message)
        this.statuscode = statuscode
        this.message = message
        this.errors = errors
        this.data = null
        this.success = false

        if (stack) {
            this.stack = stack
        }
        else {
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {ApiErrors}