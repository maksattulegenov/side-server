# Image Upload Server - Google Drive Integration

A web server that receives images from external sources and automatically uploads them to Google Drive using a service account. Perfect for automated workflows and external integrations.

## 🌟 Features

- 📤 Upload images via web interface or API
- ☁️ Automatic upload to Google Drive
- 🔐 Service account authentication (no manual auth needed)
- 🎨 Beautiful, responsive web interface
- 🧪 Includes independent test page
- 🚀 Ready for Railway deployment
- 📝 Supports: JPG, PNG, GIF, WebP (up to 10MB)

## 🚀 Quick Start

### Prerequisites

- Node.js 18 or higher
- A Google Cloud service account with Drive API access
- Railway account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/maksattulegenov/side-server.git
   cd side-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the server**
   ```bash
   npm start
   ```

4. **Access the application**
   - Web interface: http://localhost:3000
   - Upload endpoint: http://localhost:3000/api/upload
   - Health check: http://localhost:3000/api/health

5. **Test with test.html**
   - Open `test.html` in your browser
   - Make sure server URL is set to `http://localhost:3000`
   - Select an image and click "Send to Server"

## 🌐 Deployment to Railway

### Step 1: Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/maksattulegenov/side-server.git
git push -u origin main
```

### Step 2: Deploy on Railway

1. Go to [Railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `side-server` repository
4. Railway will automatically detect the Node.js project

**Important: Add Environment Variable**

After deployment, you MUST add the service account credentials:

1. In Railway, go to your project
2. Click on "Variables" tab
3. Add a new variable:
   - **Name:** `GOOGLE_SERVICE_ACCOUNT`
   - **Value:** Copy the entire contents of your local `service-account.json` file (the whole JSON object)

💡 **Tip:** The `service-account.json` file on your computer contains the credentials. Copy everything from `{` to `}` including all the quotes and paste it as the environment variable value.

### Step 3: Configure (Optional)

If you want to upload to a specific Google Drive folder:

1. Create a folder in Google Drive
2. Share the folder with your service account email:
   - `drive-uploader@side-server-481017.iam.gserviceaccount.com`
   - Give it "Editor" permissions
3. Copy the folder ID from the URL (the part after `/folders/`)
4. In Railway, add environment variable:
   - Key: `GOOGLE_DRIVE_FOLDER_ID`
   - Value: `your-folder-id`

### Step 4: Get Your Server URL

After deployment, Railway will provide a URL like:
```
https://side-server-production.up.railway.app
```

This is your public server URL!

## 📡 API Usage

### Upload Endpoint

**POST** `/api/upload`

Upload an image to Google Drive.

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body: Form data with `image` field

**Example with curl:**
```bash
curl -X POST https://your-app.railway.app/api/upload \
  -F "image=@/path/to/your/image.jpg"
```

**Example with JavaScript:**
```javascript
const formData = new FormData();
formData.append('image', fileInput.files[0]);

const response = await fetch('https://your-app.railway.app/api/upload', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(result);
```

**Response (Success):**
```json
{
  "success": true,
  "message": "File uploaded successfully to Google Drive",
  "file": {
    "name": "image.jpg",
    "id": "1abc123...",
    "webViewLink": "https://drive.google.com/file/d/..."
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Error message"
}
```

### Health Check Endpoint

**GET** `/api/health`

Check if the server is running and Google Drive API is configured.

**Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "driveApiReady": true,
  "timestamp": "2025-12-15T10:30:00.000Z"
}
```

## 🧪 Testing

### Using test.html

1. Open `test.html` in any web browser
2. Update the server URL to your Railway deployment URL
3. Select an image file
4. Click "Send to Server"
5. Check the result

### Using the Web Interface

1. Navigate to your server URL in a browser
2. Drag and drop an image or click to browse
3. Click "Upload to Google Drive"
4. View the uploaded file in Google Drive

## 📁 Project Structure

```
side-server/
├── server.js              # Main server file
├── package.json           # Dependencies
├── service-account.json   # Google service account credentials
├── .gitignore            # Git ignore rules
├── .env.example          # Environment variables template
├── README.md             # This file
├── test.html             # Independent test page
├── public/
│   └── index.html        # Web interface
└── uploads/              # Temporary upload directory (auto-created)
```

## 🔧 Configuration

### Environment Variables

**For Railway (Required):**

1. **GOOGLE_SERVICE_ACCOUNT** (Required)
   - The entire JSON content from your service account file
   - Copy from `{` to `}` including all fields
   
2. **GOOGLE_DRIVE_FOLDER_ID** (Optional)
   - The Google Drive folder ID where files should be uploaded
   - Leave empty to upload to Drive root

3. **PORT** (Automatically set by Railway)
   - Railway sets this automatically

**For Local Development:**

Create a `service-account.json` file in the root directory with your Google Cloud service account credentials. Use `service-account-template.json` as a reference.

### Service Account Setup

The service account credentials are configured via environment variable in Railway.

**Service Account Details:**
- Email: `drive-uploader@side-server-481017.iam.gserviceaccount.com`
- Project ID: `side-server-481017`

**For Local Development:**
- Keep your `service-account.json` file locally (it's in `.gitignore`)
- Never commit credentials to Git

**Important:** To upload to a specific folder, you must:
1. Share that folder with the service account email
2. Give it "Editor" permissions
3. Set the `GOOGLE_DRIVE_FOLDER_ID` environment variable

## 📝 Notes

- Maximum file size: 10MB
- Supported formats: JPG, JPEG, PNG, GIF, WebP
- Files are temporarily stored in the `uploads/` directory during upload
- Temporary files are automatically deleted after upload
- The service account authenticates automatically (no manual OAuth needed)

## 🔒 Security

- Service account credentials are stored as environment variables in Railway (not in the repository)
- The `service-account.json` file is excluded from Git via `.gitignore`
- For local development, keep `service-account.json` secure and never commit it
- CORS is enabled for all origins (configure as needed for production)

## 🐛 Troubleshooting

**"Google Drive API not initialized"**
- In Railway: Check that `GOOGLE_SERVICE_ACCOUNT` environment variable is set correctly
- Locally: Check that `service-account.json` exists in the root directory
- Verify the service account credentials are valid JSON

**"Permission denied" when uploading**
- Make sure the Google Drive folder is shared with the service account
- Check that the service account has "Editor" permissions

**"File too large"**
- Maximum file size is 10MB
- Compress your image or use a smaller file

**Connection errors in test.html**
- Verify the server URL is correct
- Make sure the server is running
- Check browser console for detailed errors

## 📄 License

ISC

## 👤 Author

Created for automated image upload workflows.

---

**Need help?** Check the health endpoint at `/api/health` to verify server status.
