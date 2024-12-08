import catchAsyncError from "../middleware/catchAsyncErrors.js";
import apiResponse from "../utils/apiResponse.js";
import prisma from "../utils/prisma.js";
import sendEmail from "../utils/sendMail.js";

// export const uploadFile = catchAsyncError(async (req, res, next) => {
//   if (!req.file) {
//     return apiResponse(false, "No file uploaded", null, 400, res);
//   }

//   const { customName, originalname, path: filePath, size, mimetype } = req.file;
//   const userId = req.user;

//   const user = await prisma.user.findFirst({
//     where: { id: userId },
//     include: {
//       files: true,
//     },
//   });
//   if (!user) {
//     return apiResponse(false, "User not found", null, 404, res);
//   }
//   const totalFileSize = user.files.reduce(
//     (total, file) => total + file.size,
//     0
//   );
//   const totalStorageInBytes = user.totalStorage * 1000 * 1000 * 1000;
//   const availableStorageInBytes = totalStorageInBytes - totalFileSize;
//   if (size > availableStorageInBytes) {
//     return apiResponse(false, "Not enough storage", null, 413, res);
//   }

//   const calculateDaysRemaining = (subscribedAt, validDays) => {
//     const currentDate = new Date();
//     const subscriptionDate = new Date(subscribedAt);
//     subscriptionDate.setDate(subscriptionDate.getDate() + validDays);
//     return subscriptionDate > new Date();
//   };

//   const daysRemaining = calculateDaysRemaining(
//     user.subscribedAt,
//     user.validDays
//   );
//   if (!daysRemaining) {
//     return apiResponse(
//       false,
//       "Your subscription has expired. Please renew your subscription.",
//       null,
//       401,
//       res
//     );
//   }

//   const file = await prisma.file.create({
//     data: {
//       name: originalname,
//       size: size,
//       type: mimetype,
//       path: `uploads/${customName}`,
//       userId,
//       private: true,
//     },
//   });

//   return apiResponse(true, "File uploaded successfully", file, 200, res);
// });


export const uploadFile = catchAsyncError(async (req, res, next) => {


  const { name, size:fileSize, type, path } = req.body;

  const size =  Number(fileSize)
  const userId = req.user;

  const user = await prisma.user.findFirst({
    where: { id: userId },
    include: {
      files: true,
    },
  });
  if (!user) {
    return apiResponse(false, "User not found", null, 404, res);
  }
  const totalFileSize = user.files.reduce(
    (total, file) => total + file.size,
    0
  );
  const totalStorageInBytes = user.totalStorage * 1000 * 1000 * 1000;
  const availableStorageInBytes = totalStorageInBytes - totalFileSize;
  if (size > availableStorageInBytes) {
    return apiResponse(false, "Not enough storage", null, 413, res);
  }

  const calculateDaysRemaining = (subscribedAt, validDays) => {
    const currentDate = new Date();
    const subscriptionDate = new Date(subscribedAt);
    subscriptionDate.setDate(subscriptionDate.getDate() + validDays);
    return subscriptionDate > new Date();
  };

  const daysRemaining = calculateDaysRemaining(
    user.subscribedAt,
    user.validDays
  );
  if (!daysRemaining) {
    return apiResponse(
      false,
      "Your subscription has expired. Please renew your subscription.",
      null,
      401,
      res
    );
  }

  const file = await prisma.file.create({
    data: {
      name,
      size,
      type,
      path,
      userId,
      private: true,
    },
  });

  console.log("fieleee", file)

  return apiResponse(true, "File uploaded successfully", file, 200, res);
});

export const getAllFiles = catchAsyncError(async (req, res, next) => {
  const { orderBy, orderDirection = "asc" } = req.query;
  console.log("order by", orderBy, orderDirection);

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const userId = req.user;
  const files = await prisma.file.findMany({
    where: {
      userId,
    },
    orderBy: {
      [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
    },
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = files.filter((file) => file.trash.length === 0);

  return apiResponse(
    true,
    "Files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const getVideoFiles = catchAsyncError(async (req, res, next) => {
  const { orderBy, orderDirection = "asc" } = req.body;
  const userId = req.user;
  const videoMimeTypes = ["video/mp4", "video/mkv", "video/avi"];

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const videos = await prisma.file.findMany({
    where: {
      userId,
      type: { in: videoMimeTypes },
    },
    orderBy: {
      [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
    },
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = videos.filter((video) => video.trash.length === 0);

  return apiResponse(
    true,
    "Video files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const getImageFiles = catchAsyncError(async (req, res, next) => {
  const { orderBy, orderDirection = "asc" } = req.body;
  const userId = req.user;
  const imageMimeTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const images = await prisma.file.findMany({
    where: {
      userId,
      type: { in: imageMimeTypes },
    },
    orderBy: {
      [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
    },
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = images.filter((image) => image.trash.length === 0);

  return apiResponse(
    true,
    "Image files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const getDocumentFiles = catchAsyncError(async (req, res, next) => {
  const { orderBy, orderDirection = "asc" } = req.body;
  const userId = req.user;
  const documentMimeTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const documents = await prisma.file.findMany({
    where: {
      userId,
      type: { in: documentMimeTypes },
    },
    orderBy: {
      [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
    },
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = documents.filter(
    (document) => document.trash.length === 0
  );

  return apiResponse(
    true,
    "Document files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const getOtherFiles = catchAsyncError(async (req, res, next) => {
  const { orderBy, orderDirection = "asc" } = req.body;
  const userId = req.user;
  const excludedMimeTypes = [
    "video/mp4",
    "video/mkv",
    "video/avi", // Video types
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp", // Image types
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Document types
  ];

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const others = await prisma.file.findMany({
    where: {
      userId,
      NOT: { type: { in: excludedMimeTypes } },
    },
    orderBy: {
      [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
    },
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = others.filter((other) => other.trash.length === 0);

  return apiResponse(
    true,
    "Other files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const getLatestFiles = catchAsyncError(async (req, res, next) => {
  const userId = req.user;
  const latestFiles = await prisma.file.findMany({
    where: {
      userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 10,
    include: {
      trash: true,
      fileShares: true,
    },
  });

  const withoutTrash = latestFiles.filter((file) => file.trash.length === 0);

  return apiResponse(
    true,
    "Latest files retrieved successfully",
    withoutTrash,
    200,
    res
  );
});

export const editFileName = catchAsyncError(async (req, res, next) => {
  const { fileId, newName } = req.body;
  const userId = req.user;
  if (!fileId || !newName) {
    return apiResponse(
      false,
      "File ID and new name are required",
      null,
      400,
      res
    );
  }

  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) {
    return apiResponse(false, "File not found", null, 404, res);
  }

  const updatedFile = await prisma.file.update({
    where: {
      id: fileId,
    },
    data: {
      name: newName,
    },
  });

  return apiResponse(
    true,
    "File name updated successfully",
    updatedFile,
    200,
    res
  );
});

export const deleteFile = catchAsyncError(async (req, res, next) => {
  const { fileId } = req.query;
  const userId = req.user;
  if (!fileId) {
    return apiResponse(false, "File ID is required", null, 400, res);
  }

  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      userId,
    },
  });

  if (!file) {
    return apiResponse(false, "File not found", null, 404, res);
  }

  await prisma.file.delete({
    where: {
      id: fileId,
    },
  });
  

  return apiResponse(true, "File deleted successfully", null, 200, res);
});

export const shareFile = catchAsyncError(async (req, res, next) => {
  const { visibility, emails, fileId } = req.body;
  const userId = req.user;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });

  if (!file) {
    return apiResponse(false, "File not found", null, 404, res);
  }

  if (file.userId !== userId) {
    return apiResponse(
      false,
      "You are not authorized to share this file",
      null,
      403,
      res
    );
  }

  let updatedFileData = { visibility: visibility.toUpperCase() };

  const accessUrl = `${process.env.BASE_URL}/dashboard/shared/${fileId}`;

  if (visibility.toUpperCase() === "PUBLIC") {
    updatedFileData = { ...updatedFileData, visibility: "PUBLIC" };
  }

  const updatedFile = await prisma.file.update({
    where: { id: fileId },
    data: updatedFileData,
  });

  if (visibility.toUpperCase() === "SHARED" && emails) {
    const existingShares = await prisma.fileShare.findMany({
      where: {
        fileId: fileId,
      },
    });

    const existingEmails = existingShares.map((share) => share.email);

    const emailsToRemove = existingEmails.filter(
      (email) => !emails.includes(email)
    );
    const emailsToAdd = emails.filter(
      (email) => !existingEmails.includes(email)
    );

    await prisma.fileShare.deleteMany({
      where: {
        fileId: fileId,
        email: { in: emailsToRemove },
      },
    });

    const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f7f6;
            color: #333;
            margin: 0;
            padding: 0;
          }
          .container {
            width: 100%;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #ffffff;
            border-radius: 8px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
          }
          h1 {
            color: #0073e6;
            font-size: 24px;
            text-align: center;
          }
          p {
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 15px;
          }
          .highlight {
            font-weight: bold;
            color: #0073e6;
          }
          .button {
            display: inline-block;
            background-color: #0073e6;
            color: #ffffff;
            padding: 12px 20px;
            text-align: center;
            text-decoration: none;
            border-radius: 4px;
            font-size: 16px;
            margin-top: 20px;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #777;
            margin-top: 30px;
          }
          .footer a {
            color: #0073e6;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Access Granted</h1>
          <p>You have been granted access to the file <span class="highlight">${file.name}</span>.</p>
          <p>You can view or download the file from the following link:</p>
          <p><a href="${accessUrl}" class="button">Access File</a></p>
          <p>Thank you for using our service!</p>
          <div class="footer">
            <p>If you have any questions, feel free to <a href="mailto:sadibwrites@gmail.com">contact us</a>.</p>
          </div>
        </div>
      </body>
    </html>
  `;

    const emailPromises = emailsToAdd.map(async (email) => {
      await prisma.fileShare.create({
        data: {
          fileId: fileId,
          userId: userId,
          email: email,
        },
      });

      await sendEmail(
        email,
        {
          subject: "Access Granted to File",
          html,
          message: `Access granted to ${file.name}`,
        },
        res
      );
    });

    await Promise.all(emailPromises);
  }

  return apiResponse(
    true,
    "File shared successfully",
    { file: updatedFile, accessUrl },
    200,
    res
  );
});

export const getSingleFile = catchAsyncError(async (req, res, next) => {
  const { fileId } = req.params;
  const userId = req.user;

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: {
      user: true,
      fileShares: true,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true },
  });

  const isAllowedToThisUser = file.fileShares.find((file) => {
    return file.email === user.email;
  });

  if (!file) {
    return apiResponse(false, "File not found", null, 404, res);
  }
  if (!isAllowedToThisUser) {
    return apiResponse(
      false,
      "You are not authorized to view this file",
      null,
      403,
      res
    );
  }

  return apiResponse(true, "File fetched successfully", file, 200, res);
});

export const getAllAcceessibleFiles = catchAsyncError(
  async (req, res, next) => {
    const userId = req.user;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    });

    if (!user) {
      return apiResponse(false, "User not found", null, 404, res);
    }

    const files = await prisma.file.findMany({
      where:{
        visibility:{
          not:"PRIVATE"
        }
      },
      include: {
        user: true,
        fileShares: true,
      },
    });
    if (!files) {
      return apiResponse(false, "No accessible files found", null, 404, res);
    }

    const accessibleFiles = files
      .map((file) => {
        const sharedFiles = file.fileShares.filter(
          (share) => share.email === user.email
        );
        if (sharedFiles.length > 0) {
          return { ...file, fileShares: sharedFiles };
        }
        return null;
      })
      .filter(Boolean);

    if (!accessibleFiles) {
      return apiResponse(false, "No accessible files found", null, 404, res);
    }
    return apiResponse(
      true,
      "Accessible files fetched successfully",
      accessibleFiles,
      200,
      res
    );
  }
);

export const getAllFilesSharedByMe = catchAsyncError(async (req, res, next) => {
  const userId = req.user;

  if (!userId) {
    return apiResponse(false, "User not found", null, 404, res);
  }

  const files = await prisma.fileShare.findMany({
    where: {
      userId,
    },
    include: {
      file: true,
    },
    where: {
      AND: [
        {
          userId,
        },
        {
          file: {
            visibility: {
              not: "PRIVATE"  
            }
          }
        }
      ]
    },
    orderBy: {
      createdAt: "desc",
    }
  });

  if (!files || files.length === 0) {
    return apiResponse(false, "No files shared by you found", null, 404, res);
  }

  return apiResponse(true, "Files Shared by you found", files, 200, res);
});
