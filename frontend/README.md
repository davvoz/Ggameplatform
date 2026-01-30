# Frontend Configuration

## 📁 File Structure

```
frontend/
├── env.js                      # Runtime environment config (REQUIRED)
├── env.template.js             # Template for env.js
├── .env.example                # Example for build tools (Vite, etc.)
├── .env.production.example     # Production example
├── js/
│   ├── config.js               # Config module (reads from env.js)
│   ├── api.js                  # API calls (uses config)
│   ├── auth.js                 # Authentication (uses config)
│   └── ...
└── index.html                  # Main HTML (loads env.js)
```

## 🚀 Quick Start

### Development Setup

1. **File `env.js` already exists** with default development settings:
   ```javascript
   window.ENV = {
       API_URL: 'http://localhost:8000',
       FRONTEND_URL: 'http://localhost:3000',
       MODE: 'development'
   };
   ```

2. **Start the backend** (from root directory):
   ```bash
   cd backend
   uvicorn app.main:app --reload
   ```

3. **Serve the frontend**:
   ```bash
   # Option 1: Python simple HTTP server
   cd frontend
   python -m http.server 3000

   # Option 2: Node.js http-server (install globally first)
   npm install -g http-server
   cd frontend
   http-server -p 3000
   ```

4. **Open browser**: `http://localhost:3000`

## 🌐 Production Deployment

### Step 1: Update `env.js`

Edit `frontend/env.js` with your production URLs:

```javascript
window.ENV = {
    API_URL: 'https://api.yourdomain.com',
    FRONTEND_URL: 'https://yourdomain.com',
    MODE: 'production'
};
```

### Step 2: Backend Environment

Set the backend CORS configuration (in `backend/.env`):

```env
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Step 3: Deploy

Upload all frontend files to your web server, ensuring:
- `env.js` is present and properly configured
- All HTML files load `env.js` before other scripts
- HTTPS is enabled (recommended)

## 📝 Configuration Details

### `env.js` (Runtime Config)

Loaded by the browser at runtime. This is the **primary** configuration method.

**Why `env.js`?**
- ✅ Works without a build tool
- ✅ Easy to update in production
- ✅ No compilation needed
- ✅ Clear separation of environments

**Important:** 
- Must be loaded **before** other scripts in HTML
- Do not commit with production credentials to Git
- Template available in `env.template.js`

### `config.js` Module

Central configuration module that:
- Reads from `window.ENV` (set by `env.js`)
- Provides helper methods
- Handles defaults gracefully

**Usage in your code:**

```javascript
import { config } from './config.js';

// Get API URL
const apiUrl = config.API_URL;

// Build full endpoint
const endpoint = config.getApiEndpoint('/games/list');

// Check environment
if (config.isDevelopment()) {

}
```

### HTML Integration

All HTML files must load `env.js` **first**:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Game Platform</title>
    <!-- Load env.js BEFORE other scripts -->
    <script src="/env.js"></script>
</head>
<body>
    <!-- content -->
    <script type="module" src="/js/main.js"></script>
</body>
</html>
```

## 🔧 Troubleshooting

### Problem: API calls fail with 404

**Solution:** 
1. Check browser console for `window.ENV`
2. Verify `env.js` is loaded (should see log message)
3. Confirm `API_URL` in `env.js` is correct

### Problem: CORS errors

**Solution:**
1. Check backend `.env` has correct `ALLOWED_ORIGINS`
2. Ensure frontend domain is in the list
3. Restart backend after changing `.env`

### Problem: `window.ENV` is undefined

**Solution:**
1. Verify `<script src="/env.js"></script>` is in HTML
2. Check browser network tab - env.js should load successfully
3. Clear browser cache and reload

## 🔐 Security Notes

**DO NOT:**
- Commit `env.js` with production URLs to Git
- Put API keys or secrets in `env.js` (it's public!)
- Use `*` for CORS origins in production

**DO:**
- Use `.gitignore` to exclude `env.js` from Git
- Keep production `env.js` on the server only
- Use HTTPS in production
- Restrict CORS to specific domains

## 📚 Files Reference

| File | Purpose | Commit to Git? |
|------|---------|----------------|
| `env.js` | Runtime config (development) | ⚠️ Yes, dev only |
| `env.template.js` | Template for env.js | ✅ Yes |
| `.env.example` | Build tool example | ✅ Yes |
| `.env.production.example` | Production template | ✅ Yes |
| `.gitignore` | Excludes env files | ✅ Yes |
| `js/config.js` | Config module | ✅ Yes |

## 🎯 Environment Variables

### Available Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `API_URL` | Backend API base URL | `http://localhost:8000` |
| `FRONTEND_URL` | Frontend base URL | `http://localhost:3000` |
| `MODE` | Environment mode | `development` or `production` |

### Adding New Variables

1. Add to `env.js`:
   ```javascript
   window.ENV = {
       API_URL: 'http://localhost:8000',
       NEW_VARIABLE: 'value'
   };
   ```

2. Access in `config.js`:
   ```javascript
   export const config = {
       API_URL: runtimeEnv.API_URL || 'default',
       NEW_VARIABLE: runtimeEnv.NEW_VARIABLE || 'default'
   };
   ```

3. Use in your code:
   ```javascript
   import { config } from './config.js';

   ```

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify `env.js` is loaded and configured
3. Check backend logs
4. Review `DEPLOYMENT.md` in root directory
