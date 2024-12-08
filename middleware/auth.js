import apiResponse from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.js";

export const isAuthenticated = async (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return apiResponse(
      false,
      "Please login to access this page",
      null,
      400,
      res
    );
  }

  const decodedData = jwt.verify(token, process.env.JWT_SECRET);
  if (!decodedData) {
    return apiResponse(false, "Invalid token", null, 401, res);
  }
  req.user = decodedData.id;

  const user = await prisma.user.findUnique({ where: { id: req.user } });
  if (user.active===false) {
    return apiResponse(false, "User account is deactivated", null, 401, res);
  }

  next();
};

export const authorizedAdmin = async (req, res, next) => {
  const user = await prisma.user.findUnique({ where: { id: req.user } });
  if (!user || user.role !== "ADMIN") {
    return apiResponse(false, "Unauthorized access", null, 403, res);
  }
  next();
};
