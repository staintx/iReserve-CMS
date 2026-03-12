const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

const isStrongPassword = (password) =>
  /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

const isValidPhone = (phone) =>
  /^[0-9+\-\s]{7,15}$/.test(phone);

module.exports = {
  isValidEmail,
  isStrongPassword,
  isValidPhone
};