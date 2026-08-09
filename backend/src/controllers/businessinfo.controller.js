const BusinessInfo = require("../models/BusinessInfo");
const asyncHandler = require("../utils/asyncHandler");

const readBusinessInfo = async () => {
  const info = await BusinessInfo.findOne();
  return info || {};
};

exports.getPublic = asyncHandler(async (req, res) => {
  const info = await readBusinessInfo();
  res.json(info);
});

exports.get = asyncHandler(async (req, res) => {
  const info = await readBusinessInfo();
  res.json(info);
});

exports.update = asyncHandler(async (req, res) => {
  const data = {
    business_name: req.body.business_name,
    contact_number: req.body.contact_number,
    email: req.body.email,
    address: req.body.address,
    pickup_address: req.body.pickup_address,
    hours: req.body.hours,
    facebook: req.body.facebook,
    instagram: req.body.instagram,
    terms_url: req.body.terms_url,
    privacy_url: req.body.privacy_url,
    deposit_percentage: req.body.deposit_percentage,
    custom_event_setup_price: req.body.custom_event_setup_price,
    custom_food_and_event_price: req.body.custom_food_and_event_price
  };

  const updated = await BusinessInfo.findOneAndUpdate(
    {},
    data,
    { returnDocument: 'after', upsert: true, setDefaultsOnInsert: true }
  );

  res.json(updated);
});
