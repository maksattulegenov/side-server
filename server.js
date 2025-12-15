const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

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
let FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

try {
  let serviceAccount;
  
  console.log('🔍 DEBUG: Checking for credentials...');
  console.log('🔍 DEBUG: GOOGLE_SERVICE_ACCOUNT exists:', !!process.env.GOOGLE_SERVICE_ACCOUNT);
  console.log('🔍 DEBUG: GOOGLE_SERVICE_ACCOUNT length:', process.env.GOOGLE_SERVICE_ACCOUNT ? process.env.GOOGLE_SERVICE_ACCOUNT.length : 0);
  
  // Try to load from environment variable first (for Railway)
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    console.log('📋 Loading credentials from environment variable...');
    try {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      console.log('✅ Successfully parsed JSON from environment variable');
      console.log('🔍 DEBUG: Service account email:', serviceAccount.client_email);
    } catch (parseError) {
      console.error('❌ Error parsing GOOGLE_SERVICE_ACCOUNT JSON:', parseError.message);
      console.error('🔍 First 100 chars:', process.env.GOOGLE_SERVICE_ACCOUNT.substring(0, 100));
    }
  } 
  // Fall back to file (for local development)
  else {
    const serviceAccountPath = path.join(__dirname, 'service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
      console.error('⚠️ No credentials found!');
      console.error('Set GOOGLE_SERVICE_ACCOUNT environment variable or create service-account.json');
    } else {
      console.log('📋 Loading credentials from service-account.json...');
      serviceAccount = require('./service-account.json');
    }
  }
  
  if (serviceAccount) {
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    
    drive = google.drive({ version: 'v3', auth });
    console.log('✅ Google Drive API initialized successfully');
  } else {
    console.error('❌ No service account loaded!');
  }
} catch (error) {
  console.error('❌ Error initializing Google Drive API:', error.message);
  console.error('Stack trace:', error.stack);
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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    driveApiReady: !!drive,
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
