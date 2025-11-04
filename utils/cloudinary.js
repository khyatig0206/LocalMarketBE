const path = require("path");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const base = path.basename(file.originalname, ext);
    const sanitizedBase = base
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
    const isPdf = file.mimetype === "application/pdf" || ext === ".pdf";

    // Choose folder based on fieldname
    let folder = "general";
    const field = file.fieldname || "";
    if (field === "businessLogo") folder = "producers/logos";
    else if (field === "aadharImages" || field === "aadhaar") folder = "kyc/aadhaar";
    else if (field === "idDocuments") folder = "kyc/id";
    else if (field === "addressProofs") folder = "kyc/address";
    else if (field === "images") folder = "products";

    // Unconditional logging to verify execution and detection
    console.log("[CloudinaryStorage params] file:", {
      originalname: file.originalname,
      mimetype: file.mimetype,
      ext,
      sanitizedBase,
      isPdf,
      folder,
    });

    const common = {
      folder,
      public_id: `${Date.now()}-${sanitizedBase}`,
    };

    if (isPdf) {
      console.log("[CloudinaryStorage params] this is a pdf");
      return {
        ...common,
        resource_type: "raw",
        type: "upload",
        access_mode: "public",
        // ensure correct format detection
        format: "pdf",
      };
    }

    return {
      ...common,
      resource_type: "image",
      type: "upload",
      access_mode: "public",
    };
  },
});

module.exports = {
  cloudinary,
  storage,
};
