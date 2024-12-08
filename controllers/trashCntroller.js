import { fileURLToPath } from "url";
import catchAsyncError from "../middleware/catchAsyncErrors.js";
import apiResponse from "../utils/apiResponse.js";
import prisma from "../utils/prisma.js";
import fs from 'fs';
import path from 'path';
import { deleteFileFromS3 } from "./s3Service.js";

export const moveToTrash = catchAsyncError(async (req, res, next) => {
  const { docId } = req.params;
  const userId = req.user;

  // Find the file and ensure it belongs to the current user
  const file = await prisma.file.findFirst({
    where: {
      id: docId,
      userId,
    },
  });

  if (!file) {
    return apiResponse(
      false,
      "File not found or access denied",
      null,
      404,
      res
    );
  }

  console.log("Moving file to trash, fileId:", file.id); // Log the fileId

  const trashedFile = await prisma.trash.create({
    data: {
      fileId: file.id,
    },
    include: {
      file: true,
    },
  });

  // await prisma.file.delete({
  //     where:{
  //         id:file.id
  //     }
  // })

  console.log("File moved to trash:", trashedFile); // Log the result

  return apiResponse(
    true,
    "File moved to trash and deleted successfully",
    trashedFile,
    200,
    res
  );
});

// Retrieve trashed files
export const getTrashedFiles = catchAsyncError(async (req, res, next) => {
  const userId = req.user;
  const { orderBy, orderDirection = "asc" } = req.query;

  const validOrderByFields = {
    date: "createdAt",
    name: "name",
    size: "size",
  };

  const orderField = validOrderByFields[orderBy] || "createdAt";

  const trashedFiles = await prisma.trash.findMany({
    where: {
      file: {
        userId,
      },
    },
    include: {
      file: true,
    },
    orderBy: {
      file: {
        [orderField]: orderDirection.toLowerCase() === "desc" ? "desc" : "asc",
      },
    },
  });

  return apiResponse(
    true,
    "Trashed files retrieved successfully",
    trashedFiles,
    200,
    res
  );
});


export const deleteExpiredTrashedFiles = catchAsyncError(
  async (req, res, next) => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Find and delete files older than 30 days in trash
    const deletedFiles = await prisma.trash.deleteMany({
      where: {
        deletedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    return apiResponse(
      true,
      "Expired trashed files deleted successfully",
      deletedFiles,
      200,
      res
    );
  }
);

export const restoreFromTrash = catchAsyncError(async (req, res, next) => {
  const { trashId } = req.params;
  const userId = req.user;

  const trashedEntry = await prisma.trash.findFirst({
    where: {
      id: trashId,
      file: {
        userId,
      },
    },
    include: {
      file: true,
    },
  });

  if (!trashedEntry || !trashedEntry.file) {
    return apiResponse(
      false,
      "Trashed file not found or access denied",
      null,
      404,
      res
    );
  }

  const restoredFile = await prisma.trash.delete({
    where: {
      id: trashId,
    },
  });

  return apiResponse(
    true,
    "File restored successfully",
    restoredFile,
    200,
    res
  );
});


export const deleteFileFromTrash = catchAsyncError(async (req, res, next) => {
  const { trashId } = req.params;
  const userId = req.user;

  const trashedEntry = await prisma.trash.findFirst({
    where: {
      id: trashId,
      file: {
        userId,
      },
    },
    include: {
      file: true,
    },
  });

  if (!trashedEntry || !trashedEntry.file) {
    return apiResponse(
      false,
      "Trashed file not found or access denied",
      null,
      404,
      res
    );
  }

  const filePath = trashedEntry.file.path;
  console.log("filePath", filePath)

  console.log("file trashed:", filePath);

  if (!filePath) {
    return apiResponse(false, "File path not found", null, 400, res);
  }

 

  try {
    await deleteFileFromS3(filePath); 
  } catch (error) {
    return apiResponse(false, error.message, null, 500, res); 
  }

  await prisma.trash.delete({
    where: {
      id: trashId,
    },
  });

  await prisma.file.delete({
    where: {
      id: trashedEntry.fileId,
    },
  });

  return apiResponse(true, "Deleted successfully", null, 200, res);
});