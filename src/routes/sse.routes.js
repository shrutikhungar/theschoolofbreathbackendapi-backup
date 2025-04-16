const express = require('express');
const router = express.Router();

// Map to hold active SSE connections per user
const clients = new Map();

/**
 * SSE endpoint for subscribing to real-time events
 * @route GET /eventos/subscribe/:userEmail
 */
router.get('/subscribe/:userEmail', (req, res) => {
  const userEmail = req.params.userEmail;
  console.log(`📡 New SSE connection for ${userEmail}`);

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send a ping to keep the connection alive
  res.write(`: ping\n\n`);

  // Save client connection
  clients.set(userEmail, res);

  // Clean up on close
  req.on('close', () => {
    console.log(`❌ Connection closed for ${userEmail}`);
    clients.delete(userEmail);
  });
});
router.post("/notify", (req, res) => {
    const { userEmail, tipo, idEntrevista } = req.body;
  console.log(userEmail, tipo, idEntrevista)
    if (!userEmail || !tipo || !idEntrevista) {
      return res.status(400).json({ error: "Missing required fields" });
    }
  
    sendNotificationToUser(userEmail, {
      tipo,
      mensaje: JSON.stringify({ idEntrevista }),
    });
    return res.status(200).json({ success: true, sentTo: userEmail });
  });
/**
 * Utility function to send notifications to specific users
 * @param {string} userEmail - The email of the user to notify
 * @param {Object} data - The data to send to the user
 */
function sendNotificationToUser(userEmail, data) {
  const res = clients.get(userEmail);
  if (res) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

module.exports = {
  router,
  sendNotificationToUser
}; 