const axios = require("axios");
exports.getContacts = async (req, res, next) => {
    try {
      const {email} = req.query
      const response = await axios.get(`https://api.systeme.io/api/contacts?email=${email}`, {
        headers: {
          'x-api-key': process.env.API_SYSTEME_KEY // Replace with the actual API key
        }
      });
      
      return res.status(200).json({ info: "OK", success: true, data: response.data });
    } catch (error) {
      next(error);
    }
  };