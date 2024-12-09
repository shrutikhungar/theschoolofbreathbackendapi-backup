const { Types } = require("mongoose");
const {
  clientUrl,
  img,
  BasicMatiRues,
  urlBackend,
} = require("../configs/vars");
const User = require("../models/user.model");
const bcrypt = require('bcryptjs');
const crypto = require("crypto");
const nodemailer = require('nodemailer')



const validateUserData = async (userData) => {
  const validationError = new User(userData).validateSync();
  if (!validationError) return null;

  return Object.values(validationError.errors).map(err => ({
    field: err.path,
    reason: err.message.replace(/\\|"/gi, "")
  }));
};

const findUserByEmail = async (email) => {
  return User.findOne({ email: email.toLowerCase() });
};

exports.store = async (req, res, next) => {
  try {
    const userExists = await findUserByEmail(req.body.email);
    if (userExists) return res.status(400).json({ success: false, info: "Email is already registered", data: 801 });

    const validationErrors = await validateUserData(req.body);
    if (validationErrors) return res.status(400).json({ success: false, info: "Invalid data structure", data: validationErrors });

    const newUser = new User({ ...req.body, email: req.body.email.toLowerCase() });
    const savedUser = await newUser.save();

    if (!savedUser._id) return res.status(400).json({ success: false, info: "Fatal Error, unable to store User, try later" });

    const tokenData = { type: savedUser.role === "user" ? 1 : 2, email: savedUser.email, password: req.body.password };
    const resp = await User.findAndGenerateToken(tokenData);

    if (!resp || !resp.success) return res.status(400).json({ ...resp, success: false });

    return res.status(200).json({ success: true, token: resp.token, user: resp.user });
  } catch (error) {
    next(error);
  }
};


exports.login = async (req, res, next) => {
  try {
    let em = req.body.email.toLowerCase();
    req.body.email = em;
    const resp = await User.findAndGenerateToken(req.body);
    if (resp == null)
      return res
        .status(400)
        .json({ success: false, info: "Credentials not found" });
    else if (!resp.success) return res.status(400).json(resp);
    const { user, token } = resp;
    return res.status(200).json({ success: true, token, user });
  } catch (error) {
    return next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user._id; // Assuming the user's ID is stored in req.user
    const { newPassword,token } = req.body;

    // Validate Passwords
   

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, info: "User not found" });
    }


    if (!isMatch) {
      return res.status(401).json({ success: false, info: "Current password is incorrect" });
    }

    // Hash New Password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update Password in Database
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ success: true, info: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

// Function to generate a password reset token
exports.generateResetToken = async (req, res, next) => {
  const userEmail = req.body.email;
  const user = await User.findOne({ email: userEmail });

  if (!user) {
      return res.status(404).json({ message: "User not found" });
  }

  // Generate token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Set token in the database with an expiration
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

 
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // upgrade later with STARTTLS
    auth: {
      user: "theschoolofbreathai@gmail.com",
      pass: "hfsn ajyg uwon cona",
    },
  });

  const resetUrl = `https://sleepappmusic.vercel.app/app/change-password/${resetToken}`;
  const mailOptions = {
      from: 'meditatewithabhi@gmail.com',
      to: user.email,
      subject: 'Password Reset',
      text: `Please click on the following link, or paste this into your browser to complete the process: ${resetUrl}`
  };

  transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
          return res.status(500).json({ message: "Error sending email" });
      }
      res.status(200).json({ message: 'Email sent' });
  });
};

exports.resetPassword = async (req, res, next) => {
  const { token, newPassword } = req.body;

  const user = await User.findOne({ 
      resetPasswordToken: token, 
      resetPasswordExpires: { $gt: Date.now() } 
  });

  if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
  }
  // Update the password
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  user.password = hashedPassword; // make sure to hash the password if needed
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.status(200).json({ message: "Password has been updated." });
};










