// api/circle-auth/token.js - OAuth Token Exchange endpoint for Circle.so
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'invalid_request',
      error_description: 'Method not allowed'
    });
    return;
  }

  const { code, client_id, client_secret, grant_type } = req.body;

  // Validate required parameters
  if (!code || !client_id || !client_secret || grant_type !== 'authorization_code') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'Missing or invalid parameters'
    });
  }

  // Validate client credentials
  const expectedClientId = process.env.CIRCLE_CLIENT_ID;
  const expectedClientSecret = process.env.CIRCLE_CLIENT_SECRET;

  if (client_id !== expectedClientId || client_secret !== expectedClientSecret) {
    return res.status(401).json({
      error: 'invalid_client',
      error_description: 'Invalid client credentials'
    });
  }

  try {
    // Decode the authorization code (contains user info)
    const userInfo = JSON.parse(Buffer.from(code, 'base64').toString());

    // Validate code hasn't expired (5 minutes)
    const codeAge = Date.now() - userInfo.timestamp;
    if (codeAge > 5 * 60 * 1000) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      });
    }

    // Generate access token (JWT format for Circle compatibility)
    const accessToken = generateAccessToken(userInfo);

    console.log(`✅ OAuth token issued for ${userInfo.email}`);

    res.status(200).json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600, // 1 hour
      scope: 'profile email'
    });

  } catch (error) {
    console.error('❌ Token exchange failed:', error);
    res.status(400).json({
      error: 'invalid_grant',
      error_description: 'Invalid authorization code'
    });
  }
}

// Generate JWT-style access token
function generateAccessToken(userInfo) {
  const payload = {
    sub: userInfo.userId,
    email: userInfo.email,
    name: userInfo.name,
    organization: userInfo.organization,
    role: userInfo.role,
    iss: 'csc-auth',
    aud: 'circle.so',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour
  };

  // For now, use base64 encoding. In production, use proper JWT signing
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}