// scripts/getRefreshToken.js
import { google } from 'googleapis';
import readline from 'readline';

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  'http://localhost:5000/oauth2callback' // Must match redirect URI
);

const scopes = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Force to get refresh token every time
});

console.log('🔗 Authorize this app by visiting this URL:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();

  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('❌ Error retrieving access token:', err);
      return;
    }
    
    console.log('✅ Refresh Token:', token.refresh_token);
    console.log('✅ Access Token:', token.access_token);
    
    // Set these in your .env file
    console.log('\n📝 Add to your .env file:');
    console.log(`GMAIL_REFRESH_TOKEN=${token.refresh_token}`);
  });
});