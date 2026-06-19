# Vision Care - Reset Password Server

A tiny Express server that replaces the Firebase Cloud Function
`resetUserPassword`, so the app doesn't need the Firebase Blaze plan.

## What it does
Exposes one endpoint: `POST /resetUserPassword`
Body: `{ "email": "...", "newPassword": "..." }`

It checks that the email has a verified OTP in the `otp_codes` Firestore
collection (written by the app's existing sendOtp/verifyOtp flow), then
uses the Firebase Admin SDK to set the new password directly - no need
to know the old password.

## Deploy on Render.com (free, no credit card)

1. Push this folder to a new GitHub repo.
2. Firebase Console -> Project settings -> Service accounts -> "Generate
   new private key". This downloads a JSON file - keep it secret, never
   commit it to git.
3. On Render.com: New -> Web Service -> connect your repo.
   - Build command: `npm install`
   - Start command: `npm start`
4. In Render's Environment tab, add:
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = the entire content of the JSON
     file from step 2, pasted as one line.
   - `API_SECRET` = any random string you make up (e.g. a long password).
5. Deploy. Render gives you a URL like
   `https://vision-care-reset.onrender.com`.
6. In the Flutter app (`auth_remote_datasource.dart`), set:
   - `_resetPasswordServerUrl` to `https://YOUR-URL.onrender.com/resetUserPassword`
   - `_resetPasswordApiKey` to the same value as `API_SECRET` above.

Note: Render's free tier puts the server to sleep after inactivity, so
the first request after a while can take ~30-50 seconds to wake up.
This is normal and free; later requests are fast.
