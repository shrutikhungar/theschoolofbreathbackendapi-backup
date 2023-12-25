const { Types } = require("mongoose");
const {
  clientUrl,
  img,
  BasicMatiRues,
  urlBackend,
} = require("../configs/vars");
const User = require("../models/user.model");


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

exports.updatePassword = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password)
      return res
        .status(400)
        .json({ success: false, info: "Invalid data structure" });
    let data = await User.findById(req.user._id);
    if (!data || !data._id)
      return res.status(400).json({ success: false, info: "User not found" });
    data.password = hashPassword(password);
    let Data = await data.save();
    if (!Data || !Data._id)
      return res
        .status(400)
        .json({ success: false, info: "Internal server error" });
    return res
      .status(200)
      .json({ success: true, info: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getRestorePasswordUrl = async (req, res, next) => {
  try {
    const { email } = req.params;
    if (!email || email == "")
      return res
        .status(400)
        .json({ success: false, info: "Invalid data structure" });
    const user = await User.findOne({ email });
    if (!user || !user._id)
      return res.status(400).json({ success: false, info: "User not found" });
    let token = randomstring.generate({
      length: 8,
      charset: "numeric",
    });
    user.securityToken = token;
    let sav = await user.save();
    if (!sav || !sav._id)
      return res.status(400).json({ success: false, info: "Internal error" });
    let restoreUrl = `${clientUrl}/login/?token=${token}`;

    SendEmail.updatePassword(
      user.email,
      "Recuperar contraseña Bitcomer",
      "resetpassword",
      { url: restoreUrl, user }
    );
    return res
      .status(200)
      .json({ success: true, info: "Email sended successfully", token: token });
  } catch (error) {
    next(error);
  }
};

exports.verifyPasswordRestore = async (req, res, next) => {
  try {
    const { user, token } = req.params;
    if (!user || !token || !Types.ObjectId.isValid(user) || token == "")
      return res
        .status(400)
        .json({ success: false, info: "Invalid data structure" });
    const data = await User.findOne({ _id: user, securityToken: token });
    if (!data || !data._id)
      return res.status(400).json({ success: false, info: "Invalid token" });
    return res.status(200).json({ success: true, info: "Correct info" });
  } catch (error) {
    next(error);
  }
};

exports.restorePassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!password || password == "")
      return res
        .status(400)
        .json({ success: false, info: "Invalid data structure" });
    const data = await User.findOne({ securityToken: token });
    if (!data || !data._id)
      return res.status(400).json({ success: false, info: "User not found" });
    const hash = hasPassword(password);
    data.password = hash;
    data.securityToken = null;
    let vali = await data.save();
    if (!vali || !vali._id)
      return res
        .status(400)
        .json({ success: false, info: "Internal server error" });
    return res
      .status(200)
      .json({ success: true, info: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
