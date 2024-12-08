import catchAsyncError from "../middleware/catchAsyncErrors.js";
import apiResponse from "../utils/apiResponse.js";
import prisma from "../utils/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import fs from "fs";
import sendEmail from "../utils/sendMail.js";

export const register = catchAsyncError(async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return apiResponse(
      false,
      "Please fill all required fields",
      null,
      400,
      res
    );
  }
  const hashedPassword = await bcrypt.hash(password, 10);

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validateEmail = (email) => {
    return emailRegex.test(email);
  };

  if (!validateEmail(email)) {
    return apiResponse(
      false,
      "Please enter a valid email address",
      null,
      400,
      res
    );
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: "USER",
    },
    include: {
      files: true,
      payments: true,
    },
  });

  const videoMimeTypes = ["video/mp4", "video/mkv", "video/avi"];
  const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", // Excel files
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ];

  const videoFiles = user.files.filter((file) =>
    videoMimeTypes.includes(file.type)
  );
  const imageFiles = user.files.filter((file) =>
    imageMimeTypes.includes(file.type)
  );
  const documentFiles = user.files.filter((file) =>
    documentMimeTypes.includes(file.type)
  );
  const otherFiles = user.files.filter(
    (file) =>
      ![...videoMimeTypes, ...imageMimeTypes, ...documentMimeTypes].includes(
        file.type
      )
  );

  const videoSize = videoFiles.reduce((total, file) => total + file.size, 0);
  const imageSize = imageFiles.reduce((total, file) => total + file.size, 0);
  const documentSize = documentFiles.reduce(
    (total, file) => total + file.size,
    0
  );
  const otherSize = otherFiles.reduce((total, file) => total + file.size, 0);

  // Convert sizes to GB
  const videoSizeInGB = (videoSize / 1e9).toFixed(2);
  const imageSizeInGB = (imageSize / 1e9).toFixed(2);
  const documentSizeInGB = (documentSize / 1e9).toFixed(2);
  const otherSizeInGB = (otherSize / 1e9).toFixed(2);

  const totalFileSize = user.files.reduce(
    (total, file) => total + file.size,
    0
  );
  const totalStorageInBytes = user.totalStorage * 1000 * 1000 * 1000;

  const availableStorageInBytes =
    totalStorageInBytes > 0 ? totalStorageInBytes - totalFileSize : 100;
  const percentageUsed =
    totalStorageInBytes > 0 ? (totalFileSize / totalStorageInBytes) * 100 : 100;

  const currentDate = new Date();
  const subscribedAt = new Date(user.subscribedAt);
  const validTillFromSubsAt = user.validDays;

  subscribedAt.setDate(subscribedAt.getDate() + validTillFromSubsAt);

  const remainingDays = Math.max(
    Math.ceil((subscribedAt - currentDate) / (1000 * 60 * 60 * 24)),
    0
  );

  delete user.password;

  const responseData = {
    user,
    totalFileSize,
    availableStorageInBytes,
    remainingDays,
    totalStorageInBytes,
    percentageUsed: percentageUsed.toFixed(2),
    downloadSpeed: user.downloadSpeed,
    uploadSpeed: user.uploadSpeed,
    videoSizeInGB,
    imageSizeInGB,
    documentSizeInGB,
    otherSizeInGB,
  };

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_SECRET_EXPIRES,
  });

  res
    .status(201)
    .cookie("token", token, {
      secure: process.env.NODE_ENV === "production",
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "User created successfully",
      data: responseData,
    });
});

export const login = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return apiResponse(
      false,
      "Please fill all required fields",
      null,
      400,
      res
    );
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validateEmail = (email) => {
    return emailRegex.test(email);
  };

  if (!validateEmail(email)) {
    return apiResponse(
      false,
      "Please enter a valid email address",
      null,
      400,
      res
    );
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      files: true,
      payments: true,
    },
  });

  if (!user) {
    return apiResponse(false, "User not found", null, 401, res);
  }

  if (user.active === false) {
    return apiResponse(false, "User account is deactivated", null, 401, res);
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return apiResponse(false, "Invalid credentials", null, 401, res);
  }

  const videoMimeTypes = ["video/mp4", "video/mkv", "video/avi"];
  const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", // Excel files
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ];

  const videoFiles = user.files.filter((file) =>
    videoMimeTypes.includes(file.type)
  );
  const imageFiles = user.files.filter((file) =>
    imageMimeTypes.includes(file.type)
  );
  const documentFiles = user.files.filter((file) =>
    documentMimeTypes.includes(file.type)
  );
  const otherFiles = user.files.filter(
    (file) =>
      ![...videoMimeTypes, ...imageMimeTypes, ...documentMimeTypes].includes(
        file.type
      )
  );

  const videoSize = videoFiles.reduce((total, file) => total + file.size, 0);
  const imageSize = imageFiles.reduce((total, file) => total + file.size, 0);
  const documentSize = documentFiles.reduce(
    (total, file) => total + file.size,
    0
  );
  const otherSize = otherFiles.reduce((total, file) => total + file.size, 0);

  // Convert sizes to GB
  const videoSizeInGB = (videoSize / 1e9).toFixed(2);
  const imageSizeInGB = (imageSize / 1e9).toFixed(2);
  const documentSizeInGB = (documentSize / 1e9).toFixed(2);
  const otherSizeInGB = (otherSize / 1e9).toFixed(2);

  const totalFileSize = user.files.reduce(
    (total, file) => total + file.size,
    0
  );
  const totalStorageInBytes = user.totalStorage * 1000 * 1000 * 1000;

  const availableStorageInBytes =
    totalStorageInBytes > 0 ? totalStorageInBytes - totalFileSize : 100;
  const percentageUsed =
    totalStorageInBytes > 0 ? (totalFileSize / totalStorageInBytes) * 100 : 100;

  const currentDate = new Date();
  const subscribedAt = new Date(user.subscribedAt);
  const validTillFromSubsAt = user.validDays;

  subscribedAt.setDate(subscribedAt.getDate() + validTillFromSubsAt);

  const remainingDays = Math.max(
    Math.ceil((subscribedAt - currentDate) / (1000 * 60 * 60 * 24)),
    0
  );

  delete user.password;

  const responseData = {
    user,
    totalFileSize,
    availableStorageInBytes,
    remainingDays,
    totalStorageInBytes,
    percentageUsed: percentageUsed.toFixed(2),
    downloadSpeed: user.downloadSpeed,
    uploadSpeed: user.uploadSpeed,
    videoSizeInGB,
    imageSizeInGB,
    documentSizeInGB,
    otherSizeInGB,
  };

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_SECRET_EXPIRES,
  });
  res
    .status(201)
    .cookie("token", token, {
      secure: process.env.NODE_ENV === "production",
      expires: new Date(
        Date.now() + process.env.COOKIE_EXPIRE * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    })
    .json({
      success: true,
      message: "Logged in successfully",
      data: responseData,
    });
});

export const logout = catchAsyncError(async (req, res, next) => {
  res.cookie("token", null, {
    expires: new Date(Date.now()),
    httpOnly: true,
  });
  apiResponse(true, "logged out successfully", null, 200, res);
});

// export const updateUser = catchAsyncError(async (req, res, next) => {
//   const userId = req.user;
//   const { name, email } = req.body;

//   const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA0-9]{2,}$/;
//   const validateEmail = (email) => {
//     return emailRegex.test(email);
//   };

//   if (!validateEmail(email)) {
//     return apiResponse(
//       false,
//       "Please enter a valid email address",
//       null,
//       400,
//       res
//     );
//   }

//   const user = await prisma.user.findUnique({
//     where: { id: userId },
//     select: { id: true, name: true, email: true, image: true },
//   });

//   if (!user) {
//     return apiResponse(false, "User not found", null, 404, res);
//   }

//   const oldImage = user.image;

//   if (req.file) {
//     if (oldImage) {
//       try {
//         if (fs.existsSync(oldImage)) {
//           fs.unlinkSync(oldImage);
//         }
//       } catch (err) {
//         return apiResponse(false, "Failed to delete old image", null, 500, res);
//       }
//     }

//     const newImage = req.file.filename;

//     try {
//       const updatedUser = await prisma.user.update({
//         where: { id: userId },
//         data: {
//           name,
//           email,
//           image: `uploads/${newImage}`,
//         },
//       });

//       return apiResponse(
//         true,
//         "Profile updated successfully",
//         updatedUser,
//         200,
//         res
//       );
//     } catch (err) {
//       return apiResponse(
//         false,
//         "Failed to update user profile",
//         null,
//         500,
//         res
//       );
//     }
//   } else {
//     try {
//       const updatedUser = await prisma.user.update({
//         where: { id: userId },
//         data: { name, email },
//       });

//       return apiResponse(
//         true,
//         "Profile updated successfully",
//         updatedUser,
//         200,
//         res
//       );
//     } catch (err) {
//       return apiResponse(
//         false,
//         "Failed to update user profile",
//         null,
//         500,
//         res
//       );
//     }
//   }
// });


export const updateUser = catchAsyncError(async (req, res, next) => {
  const userId = req.user;
  const { name, email, image } = req.body;

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const validateEmail = (email) => {
    return emailRegex.test(email);
  };
  if (!validateEmail(email)) {
    return apiResponse(false, "Please enter a valid email address", null, 400, res);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });

  if (!user) {
    return apiResponse(false, "User not found", null, 404, res);
  }

  const oldImage = user.image;

  if (image) {
   
    

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          image,
        },
      });

      return apiResponse(true, "Profile updated successfully", updatedUser, 200, res);
    } catch (err) {
      console.error('Error updating user profile:', err);
      return apiResponse(false, "Failed to update user profile", null, 500, res);
    }
  } else {
    // If no image, update without changing the image
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { name, email },
      });

      return apiResponse(true, "Profile updated successfully", updatedUser, 200, res);
    } catch (err) {
      console.error('Error updating user profile:', err);
      return apiResponse(false, "Failed to update user profile", null, 500, res);
    }
  }
});





export const updatePassword = catchAsyncError(async (req, res, next) => {
  const id = req.user;
  const { oldPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    return apiResponse(false, "User not found", null, 401, res);
  }

  const isPassMatched = await bcrypt.compare(oldPassword, user.password);
  if (!isPassMatched) {
    return apiResponse(false, "Invalid credentials", null, 401, res);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id },
    data: {
      password: hashedPassword,
    },
  });

  apiResponse(true, "Password updated successfully", null, 200, res);
});

export const fetchMyProfile = catchAsyncError(async (req, res, next) => {
  const id = req.user;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      files: true,
      payments: true,
    },
  });

  if (!user) {
    return next(new ErrorResponse("User not found", 404));
  }
  const videoMimeTypes = ["video/mp4", "video/mkv", "video/avi"];
  const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel", // Excel files
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
  ];

  const videoFiles = user.files.filter((file) =>
    videoMimeTypes.includes(file.type)
  );

  const imageFiles = user.files.filter((file) =>
    imageMimeTypes.includes(file.type)
  );
  const documentFiles = user.files.filter((file) =>
    documentMimeTypes.includes(file.type)
  );
  const otherFiles = user.files.filter(
    (file) =>
      ![...videoMimeTypes, ...imageMimeTypes, ...documentMimeTypes].includes(
        file.type
      )
  );

  const videoSize = videoFiles.reduce((total, file) => total + file.size, 0);
  const imageSize = imageFiles.reduce((total, file) => total + file.size, 0);
  const documentSize = documentFiles.reduce(
    (total, file) => total + file.size,
    0
  );
  const otherSize = otherFiles.reduce((total, file) => total + file.size, 0);

  // Convert sizes to GB
  const videoSizeInGB = (videoSize / 1e9).toFixed(2);
  const imageSizeInGB = (imageSize / 1e9).toFixed(2);
  const documentSizeInGB = (documentSize / 1e9).toFixed(2);
  const otherSizeInGB = (otherSize / 1e9).toFixed(2);

  const totalFileSize = user.files.reduce(
    (total, file) => total + file.size,
    0
  );
  const totalStorageInBytes = user.totalStorage * 1000 * 1000 * 1000;

  const availableStorageInBytes =
    totalStorageInBytes > 0 ? totalStorageInBytes - totalFileSize : 100;
  const percentageUsed =
    totalStorageInBytes > 0 ? (totalFileSize / totalStorageInBytes) * 100 : 100;

  const currentDate = new Date();
  const subscribedAt = new Date(user.subscribedAt);
  const validTillFromSubsAt = user.validDays;

  subscribedAt.setDate(subscribedAt.getDate() + validTillFromSubsAt);

  const remainingDays = Math.max(
    Math.ceil((subscribedAt - currentDate) / (1000 * 60 * 60 * 24)),
    0
  );

  delete user.password;

  const responseData = {
    user,
    totalFileSize,
    availableStorageInBytes,
    remainingDays,
    totalStorageInBytes,
    percentageUsed: percentageUsed.toFixed(2),
    downloadSpeed: user.downloadSpeed,
    uploadSpeed: user.uploadSpeed,
    videoSizeInGB,
    imageSizeInGB,
    documentSizeInGB,
    otherSizeInGB,
  };

  apiResponse(true, `Welcome ${user.name}`, responseData, 200, res);
});

export const getAllUsers = catchAsyncError(async (req, res, next) => {
  const users = await prisma.user.findMany();
  apiResponse(true, "All Users", users, 200, res);
});

export const toggleActiveUser = catchAsyncError(async (req, res, next) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return apiResponse(false, "User not found", null, 400, res);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { active: !user.active },
  });

  apiResponse(true, "User status toggled successfully", updatedUser, 200, res);
});

export const forgetPassword = catchAsyncError(async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return apiResponse(false, "Email is required", null, 400, res);
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return apiResponse(false, "User not found", null, 400, res);
    }

    const resetToken = Math.floor(Math.random() * 10000); 
    const resetTokenExpire = new Date(Date.now() + 15 * 60 * 1000); 

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f7fa; border-radius: 8px; border: 1px solid #ddd;">
        <h2 style="text-align: center; color: #333;">Reset Your Password</h2>
        <p style="font-size: 16px; color: #555; text-align: center;">We received a request to reset your password. Please use the OTP below to complete the process.</p>
        <div style="text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; padding: 15px; background-color: #007bff; color: #fff; border-radius: 5px;">
          ${resetToken}
        </div>
        <p style="font-size: 14px; color: #555; text-align: center;">This OTP is valid for the next 15 minutes. If you did not request a password reset, please ignore this email.</p>
        <p style="font-size: 14px; color: #555; text-align: center;">Regards, <br/> Your Application Team</p>
      </div>
    `;

    await sendEmail(email, { 
      subject: "Reset Password",
      html: htmlContent,
    }, res);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken,
        resetTokenExpire,
      },
    });

    return apiResponse(true, "OTP sent to your email", null, 200, res);
  } catch (error) {
    console.error(error);
    return apiResponse(false, "An error occurred", null, 500, res);
  }
});


export const resetPassword = catchAsyncError(async (req, res, next) => {
  const { resetToken: token, password, email } = req.body;

  let id ;

  const resetToken= Number(token)
  if (resetToken && !password) {
    const user = await prisma.user.findFirst({
      where: {
        resetToken,
        resetTokenExpire: { gt: new Date() },
      }
    });


    if (!user) {
      return apiResponse(false, "Invalid OTP or token expired", null, 400, res);
    }
   

    return apiResponse(true, "Correct OTP. Please enter your new password", null, 200, res);
  }

  if (resetToken && password) {
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log(id)
    const user = await prisma.user.findFirst({
      where: {
        resetToken,
      },
    });

    if (!user) {
      return apiResponse(false, "User not found", null, 400, res);
    }

    await prisma.user.update({
      where:{
        id: user.id,
      },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpire: null,
      }

    })

    return apiResponse(true, "Password updated successfully", null, 200, res);
  }

  return apiResponse(false, "Invalid request", null, 400, res);
});
