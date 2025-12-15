const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// OAuth2 credentials
const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const OAUTH_REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/oauth2callback';
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp|WEBP)$/)) {
      req.fileValidationError = 'Only image files are allowed!';
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// Google Drive setup
let drive;
let oauth2Client;
let FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

try {
  console.log('🔍 Initializing Google Drive API...');
  
  // Use OAuth2 if credentials are provided
  if (OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET) {
    console.log('📋 Using OAuth2 authentication...');
    
    oauth2Client = new google.auth.OAuth2(
      OAUTH_CLIENT_ID,
      OAUTH_CLIENT_SECRET,
      OAUTH_REDIRECT_URI
    );
    
    if (REFRESH_TOKEN) {
      oauth2Client.setCredentials({
        refresh_token: REFRESH_TOKEN
      });
      drive = google.drive({ version: 'v3', auth: oauth2Client });
      console.log('✅ Google Drive API initialized with OAuth2');
    } else {
      console.log('⚠️ No refresh token found. Visit /auth to authenticate.');
    }
  }
  // Fall back to service account
  else {
    console.log('📋 Attempting service account authentication...');
    let serviceAccount;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      console.log('📋 Loading credentials from environment variable...');
      try {
        serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
        console.log('✅ Successfully parsed JSON from environment variable');
        console.log('🔍 Service account email:', serviceAccount.client_email);
      } catch (parseError) {
        console.error('❌ Error parsing GOOGLE_SERVICE_ACCOUNT JSON:', parseError.message);
      }
    } else {
      const serviceAccountPath = path.join(__dirname, 'service-account.json');
      
      if (fs.existsSync(serviceAccountPath)) {
        console.log('📋 Loading credentials from service-account.json...');
        serviceAccount = require('./service-account.json');
      } else {
        console.error('⚠️ No credentials found!');
      }
    }
    
    if (serviceAccount) {
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });
      
      drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API initialized with service account');
      console.log('⚠️ Note: Service accounts require a Shared Drive to upload files');
    }
  }
} catch (error) {
  console.error('❌ Error initializing Google Drive API:', error.message);
}

// Function to upload file to Google Drive
async function uploadToGoogleDrive(filePath, fileName, mimeType) {
  try {
    const fileMetadata = {
      name: fileName
    };
    
    // Only add parents if FOLDER_ID is set and looks valid (not a URL)
    if (FOLDER_ID && !FOLDER_ID.startsWith('http')) {
      fileMetadata.parents = [FOLDER_ID];
      console.log(`📁 Uploading to folder: ${FOLDER_ID}`);
    } else {
      console.log(`📁 Uploading to Drive root (no folder specified)`);
    }

    const media = {
      mimeType: mimeType,
      body: fs.createReadStream(filePath)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink'
    });

    console.log('✅ File uploaded to Google Drive:', response.data.name);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading to Google Drive:', error.message);
    throw error;
  }
}

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// OAuth routes
app.get('/auth', (req, res) => {
  if (!oauth2Client) {
    return res.status(500).send('OAuth2 not configured. Set OAUTH_CLIENT_ID and OAUTH_CLIENT_SECRET environment variables.');
  }
  
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/drive.file'],
    prompt: 'consent'
  });
  
  res.redirect(authUrl);
});

app.get('/oauth2callback', async (req, res) => {
  const { code } = req.query;
  
  if (!code) {
    return res.status(400).send('No authorization code provided');
  }
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    res.send(`
      <html>
        <head><title>Authentication Successful</title></head>
        <body style="font-family: Arial; padding: 40px; max-width: 800px; margin: 0 auto;">
          <h1 style="color: green;">✅ Authentication Successful!</h1>
          <p>Copy this refresh token and add it to your Railway environment variables:</p>
          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <strong>Variable Name:</strong> REFRESH_TOKEN<br><br>
            <strong>Variable Value:</strong><br>
            <code style="background: white; padding: 10px; display: block; margin-top: 10px; word-break: break-all;">
              ${tokens.refresh_token}
            </code>
          </div>
          <p>After adding this to Railway, your server will be able to upload files to your Google Drive!</p>
          <p><a href="/">← Back to Home</a></p>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send('Error during authentication: ' + error.message);
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    driveApiReady: !!drive,
    authMethod: oauth2Client ? 'OAuth2' : 'Service Account',
    timestamp: new Date().toISOString()
  });
});

// Upload endpoint
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Check if Drive API is initialized
    if (!drive) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(500).json({
        success: false,
        error: 'Google Drive API not initialized. Please check service-account.json'
      });
    }

    console.log(`📤 Uploading file: ${req.file.originalname}`);

    // Upload to Google Drive
    const driveFile = await uploadToGoogleDrive(
      req.file.path,
      req.file.originalname,
      req.file.mimetype
    );

    // Clean up local file after upload
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'File uploaded successfully to Google Drive',
      file: {
        name: driveFile.name,
        id: driveFile.id,
        webViewLink: driveFile.webViewLink
      }
    });

  } catch (error) {
    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    console.error('❌ Upload error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File is too large. Maximum size is 10MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: err.message
    });
  }
  
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 Upload endpoint: http://localhost:${PORT}/api/upload`);
  console.log(`🏠 Web interface: http://localhost:${PORT}`);
  if (FOLDER_ID) {
    console.log(`📁 Google Drive Folder ID: ${FOLDER_ID}`);
  } else {
    console.log('📁 No specific folder ID set - files will be uploaded to Drive root');
  }
});
