const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = async (fileBuffer, folder = "ireserve", options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder, resource_type: "auto", ...options }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    }).end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;