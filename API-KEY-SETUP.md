# Anthropic API Key Setup Tutorial

This tutorial will guide you through obtaining and configuring your Anthropic API key for use with Napoleon (formerly Napoleon).

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Obtaining Your API Key](#obtaining-your-api-key)
3. [Security Best Practices](#security-best-practices)
4. [Platform-Specific Setup](#platform-specific-setup)
   - [macOS](#macos)
   - [Linux](#linux)
   - [Windows](#windows)
5. [Verification Steps](#verification-steps)
6. [Troubleshooting](#troubleshooting)

## System Requirements

**Node.js Version**: Napoleon requires Node.js 18.0.0 or higher.

### Check Your Node.js Version

```bash
node --version
```

If you need to upgrade Node.js:

- **macOS**: Use [Homebrew](https://brew.sh/) - `brew install node`
- **Linux**: Use your package manager or download from [nodejs.org](https://nodejs.org/)
- **Windows**: Download from [nodejs.org](https://nodejs.org/) or use [Chocolatey](https://chocolatey.org/) - `choco install nodejs`

**Alternative**: Use [Node Version Manager (nvm)](https://github.com/nvm-sh/nvm) to manage multiple Node.js versions:

```bash
# Install Node.js 18 (or latest LTS)
nvm install 18
nvm use 18
```

## Obtaining Your API Key

To get your Anthropic API key:

1. **Visit the Anthropic Console**: Go to [console.anthropic.com](https://console.anthropic.com)
2. **Sign in or Create Account**: Log in with your existing account or create a new one
3. **Navigate to API Keys**: Once logged in, go to the "API Keys" section
4. **Create New Key**: Click "Create Key" and give it a descriptive name (e.g., "Napoleon Development")
5. **Copy Your Key**: Copy the generated key immediately - you won't be able to see it again!

⚠️ **Important**: Your API key starts with `sk-ant-` and is approximately 100 characters long.

## Security Best Practices

🔐 **Critical Security Guidelines:**

- **Never commit API keys to version control** - Always use environment variables
- **Use separate keys for different environments** (development, staging, production)
- **Rotate keys regularly** - Generate new keys every 90 days
- **Limit key permissions** - Only grant necessary access levels
- **Store keys securely** - Use system environment variables or secure key management

### Adding to .gitignore

Ensure your `.gitignore` file includes:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
.env.development.local
.env.production.local

# API keys and secrets
**/api-key.txt
**/*secret*
**/*key*
config/secrets.json
config/keys.json
*.key
*.pem
.anthropic-key
```

## Platform-Specific Setup

### macOS

#### Option 1: Using ~/.zshrc (Recommended)

1. **Open Terminal**
2. **Edit your shell profile**:
   ```bash
   nano ~/.zshrc
   ```
3. **Add the environment variable**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```
4. **Save and reload**:
   ```bash
   source ~/.zshrc
   ```

#### Option 2: Using ~/.bash_profile

If you're using bash instead of zsh:

1. **Edit bash profile**:
   ```bash
   nano ~/.bash_profile
   ```
2. **Add the environment variable**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```
3. **Save and reload**:
   ```bash
   source ~/.bash_profile
   ```

### Linux

#### Option 1: Using ~/.bashrc (Most Common)

1. **Open terminal**
2. **Edit bashrc**:
   ```bash
   nano ~/.bashrc
   ```
3. **Add the environment variable**:
   ```bash
   export ANTHROPIC_API_KEY="your-api-key-here"
   ```
4. **Save and reload**:
   ```bash
   source ~/.bashrc
   ```

#### Option 2: Using ~/.profile (System-wide)

For system-wide access:

1. **Edit profile**:
   ```bash
   sudo nano /etc/environment
   ```
2. **Add the variable**:
   ```bash
   ANTHROPIC_API_KEY="your-api-key-here"
   ```
3. **Restart or reload**:
   ```bash
   source /etc/environment
   ```

### Windows

#### Option 1: Using PowerShell (Recommended)

1. **Open PowerShell as Administrator**
2. **Set the environment variable**:
   ```powershell
   [Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY", "your-api-key-here", [EnvironmentVariableTarget]::User)
   ```
3. **Restart PowerShell to apply changes**

#### Option 2: Using Command Prompt

1. **Open Command Prompt as Administrator**
2. **Set the environment variable**:
   ```cmd
   setx ANTHROPIC_API_KEY "your-api-key-here"
   ```
3. **Restart Command Prompt to apply changes**

#### Option 3: Using System Properties GUI

1. **Open System Properties**: Press `Win + R`, type `sysdm.cpl`, press Enter
2. **Click "Environment Variables"**
3. **Under "User variables", click "New"**
4. **Variable name**: `ANTHROPIC_API_KEY`
5. **Variable value**: Your API key
6. **Click OK** and restart any open terminals

## Verification Steps

After setting up your API key, verify it's working correctly:

### 1. Check Environment Variable

**macOS/Linux:**
```bash
echo $ANTHROPIC_API_KEY
```

**Windows (PowerShell):**
```powershell
echo $env:ANTHROPIC_API_KEY
```

**Windows (Command Prompt):**
```cmd
echo %ANTHROPIC_API_KEY%
```

### 2. Verify Node.js Version

Check that you have Node.js 18.0.0 or higher:

```bash
node --version
```

### 3. Test with Node.js

Create a test script to verify your API key:

```javascript
// test-api-key.js
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);

console.log('Node.js Version:', nodeVersion);
console.log('Node.js 18+ Required:', majorVersion >= 18 ? '✅ Yes' : '❌ No (Please upgrade)');
console.log('API Key present:', !!process.env.ANTHROPIC_API_KEY);
console.log('API Key format:', process.env.ANTHROPIC_API_KEY ? '✅ Correct format' : '❌ Not found');

// Test SDK environment check
try {
  const sdkTypes = require('./src/core/sdk/sdk-types');
  const envCheck = sdkTypes.checkSDKEnvironment();
  console.log('SDK Environment Check:');
  console.log('  - Node.js version valid:', envCheck.nodeVersionValid ? '✅' : '❌');
  console.log('  - API key present:', envCheck.apiKeyPresent ? '✅' : '❌');
  console.log('  - SDK package present:', envCheck.sdkPackagePresent ? '✅' : '❌');
  
  if (envCheck.errors.length > 0) {
    console.log('  - Errors:', envCheck.errors.join(', '));
  }
} catch (error) {
  console.log('SDK Types module not found - this is expected during initial setup');
}
```

Run with:
```bash
node test-api-key.js
```

### 3. Test with Napoleon

Once your API key is configured, test with Napoleon:

```bash
napoleon status
```

## Troubleshooting

### Common Issues and Solutions

#### Issue: "API key not found" error

**Symptoms**: Application reports missing API key despite setting it

**Solutions**:
1. **Restart your terminal** after setting the environment variable
2. **Check spelling**: Variable name must be exactly `ANTHROPIC_API_KEY`
3. **Verify the key format**: Should start with `sk-ant-`
4. **Check for spaces**: Ensure no extra spaces in the key value

#### Issue: "Invalid API key" error

**Symptoms**: Application reports invalid API key

**Solutions**:
1. **Regenerate the key** in the Anthropic console
2. **Check for truncation**: Ensure the entire key was copied
3. **Verify account status**: Check if your Anthropic account is active

#### Issue: Environment variable not persisting

**Symptoms**: Variable works in current session but disappears after restart

**Solutions**:
- **macOS/Linux**: Add to the correct shell profile (`.zshrc`, `.bashrc`, `.bash_profile`)
- **Windows**: Use system environment variables instead of session variables

#### Issue: Different shells not recognizing the variable

**Symptoms**: Works in one shell but not another

**Solutions**:
- **Add to multiple profiles**: Set in both `.bashrc` and `.zshrc`
- **Use system-wide setting**: Set in `/etc/environment` (Linux) or system properties (Windows)

#### Issue: Docker containers not seeing the variable

**Symptoms**: API key works locally but not in Docker

**Solutions**:
- **Pass environment variable**: Use `-e ANTHROPIC_API_KEY` in docker run
- **Use docker-compose**: Add to environment section in docker-compose.yml

### Getting Help

If you continue to have issues:

1. **Check the logs**: Look for specific error messages
2. **Verify your account**: Ensure your Anthropic account is active and has API access
3. **Test with curl**: Use curl to test API connectivity directly
4. **Contact support**: Reach out to Anthropic support for account-related issues

### Test API Connection with curl

To test your API key directly:

```bash
curl -X POST "https://api.anthropic.com/v1/messages" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ANTHROPIC_API_KEY" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 10,
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

A successful response indicates your API key is working correctly.

---

**Next Steps**: Once your API key is configured, you can proceed with using Napoleon or migrate to the new Napoleon project. See the [Migration Guide](./MIGRATION.md) for more information.