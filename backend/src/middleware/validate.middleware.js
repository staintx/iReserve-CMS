const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const errorMessages = error.details.map((d) => d.message);
    const friendlySummary =
      errorMessages.length === 1
        ? errorMessages[0]
        : errorMessages.join(". ");

    return res.status(400).json({
      message: friendlySummary || "Please review your information and correct the highlighted fields.",
      errors: errorMessages
    });
  }
  req.body = value;
  next();
};

module.exports = validate;