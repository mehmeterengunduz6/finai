# Performance Optimization Guide

## 🚀 Fixing "Slow filesystem detected" Warning

The "slow filesystem detected" warning from Next.js can be resolved with these optimizations:

### 1. ✅ Already Implemented
- **Turbopack enabled**: `npm run dev` uses `--turbopack` flag
- **Optimized Next.js config**: webpack optimizations, SWC minification
- **Clean build cache**: `.next` directory cleared

### 2. 🍎 macOS Specific Optimizations

#### Exclude from Spotlight Indexing
1. Open **System Preferences > Spotlight > Privacy**
2. Click "+" and add your project folder: `/Users/erengunduz/Desktop/react/finai`
3. This prevents Spotlight from indexing your project files

#### Disable Time Machine for Development
1. Open **Time Machine Preferences**
2. Click "Options"
3. Add your project folder to excluded items

#### Antivirus Exclusions
If you have antivirus software:
1. Exclude your project directory from real-time scanning
2. Exclude `node_modules` and `.next` folders

### 3. 🔧 Development Commands

Use these optimized commands:

```bash
# Fastest development server
npm run dev:fast

# Check filesystem performance
npm run check-perf

# Clean build cache if needed
npm run clean

# Alternative fast development
NODE_ENV=development npm run dev
```

### 4. 🚀 Advanced Optimizations

#### Memory Settings
Add to your shell profile (`.zshrc` or `.bash_profile`):
```bash
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Custom Build Directory
If the warning persists, you can move builds to a faster location:
```bash
# In your .env.local
NEXT_BUILD_DIR=/tmp/finai-builds
```

#### File Watcher Optimizations
For large projects, adjust file watchers:
```bash
# Increase system file watcher limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
```

### 5. 📊 Performance Monitoring

Your current performance (from check-perf script):
- ✅ Write Speed: 8ms for 1MB (Good)
- ✅ Read Speed: 2ms for 1MB (Good)
- ✅ Not on network drive
- ✅ No antivirus interference detected

### 6. 🐛 Troubleshooting

If the warning persists:

1. **Restart development server**:
   ```bash
   npm run clean
   npm run dev:fast
   ```

2. **Check for background processes**:
   - Close unnecessary applications
   - Check Activity Monitor for high CPU usage

3. **Verify no network issues**:
   - Ensure project is on local SSD, not network drive
   - Check if any folders are synced to cloud storage

4. **Update Next.js**:
   ```bash
   npm update next
   ```

### 7. 🎯 Expected Results

After implementing these optimizations:
- ⚡ Faster development server startup
- 🔄 Faster hot reloading
- 📦 Reduced bundle sizes
- 🚫 No more "slow filesystem" warnings

### 8. 📝 Environment Variables

Add these to your `.env.local`:
```env
# Disable telemetry for faster builds
NEXT_TELEMETRY_DISABLED=1

# Development optimizations
NODE_ENV=development

# Memory optimizations
NODE_OPTIONS=--max-old-space-size=4096
``` 