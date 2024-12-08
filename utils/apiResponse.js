const apiResponse = (success, message, data, apiStatus = 200, response) => {
    return response.status(apiStatus).json({
        success,
        message,
        data
    });
};

export default apiResponse;
