const cloudinary = require("../config/cloudinary");

const uploadToCloudinary = async (fileBuffer, folder = "ireserve") => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    }).end(fileBuffer);
  });
};

module.exports = uploadToCloudinary;