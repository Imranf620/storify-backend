import apiResponse from "../utils/apiResponse.js";

const error = (err, req, res, next) => {
  err.status = err.status || 500;
  err.message = err.message || "internal server error";

  if (err.code === "P2002") {
    const message = `The ${err.meta.target} already exists.`;
    return apiResponse(false, message, null, 400, res);
  }

  return res.status(err.status).json({
    success: false,
    message: err.message,
    error: err.stack,
  });
};

export default error;
