import multer from "multer";
import path from "path";

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const userId = req.user 
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileExtension = path.extname(file.originalname);

      const originalName = file.originalname;
      const filename = `${file.fieldname}-${userId}-${uniqueSuffix}${fileExtension}`;

      file.customName = filename;
      file.originalname = originalName; 

      cb(null, filename);
    },
  }),
});

export default upload;
