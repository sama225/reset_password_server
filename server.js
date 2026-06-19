const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// The full service-account JSON is provided as a single environment
// variable on Render (FIREBASE_SERVICE_ACCOUNT_JSON), never committed to git.
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Optional shared-secret header so random people can't spam this endpoint.
// Set API_SECRET on Render and send the same value from the Flutter app.
const API_SECRET = process.env.API_SECRET || '';

app.get('/', (req, res) => {
  res.send('Vision Care reset-password service is running.');
});

app.post('/resetUserPassword', async (req, res) => {
  try {
    if (API_SECRET) {
      const provided = req.header('x-api-key');
      if (provided !== API_SECRET) {
        return res.status(401).json({ error: 'unauthorized', message: 'Invalid API key.' });
      }
    }

    const { email, newPassword } = req.body || {};
    if (!email || !newPassword) {
      return res.status(400).json({ error: 'invalid-argument', message: 'Email and password required.' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Same check the old Cloud Function did: only proceed if this email
    // has a verified OTP sitting in Firestore (written by the app's
    // sendOtp/verifyOtp flow via EmailJS).
    const otpDoc = await db.collection('otp_codes').doc(normalizedEmail).get();
    if (!otpDoc.exists || otpDoc.data().verified !== true) {
      return res.status(403).json({ error: 'permission-denied', message: 'OTP not verified.' });
    }

    let user;
    try {
      user = await admin.auth().getUserByEmail(normalizedEmail);
    } catch (err) {
      console.error('getUserByEmail failed for', normalizedEmail, err);
      if (err.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'not-found', message: 'No account found with this email.' });
      }
      return res.status(500).json({ error: 'internal', message: err.message || 'Auth lookup failed.' });
    }

    await admin.auth().updateUser(user.uid, { password: newPassword });
    await db.collection('otp_codes').doc(normalizedEmail).delete();

    return res.json({ success: true });
  } catch (err) {
    console.error('resetUserPassword error', err);
    return res.status(500).json({ error: 'internal', message: err.message || 'Unexpected error.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
