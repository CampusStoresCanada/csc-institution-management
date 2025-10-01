// api/circle-auth/profile.js - OAuth Profile endpoint for Circle.so
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'invalid_request',
      error_description: 'Method not allowed'
    });
    return;
  }

  // Extract access token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'invalid_token',
      error_description: 'Missing or invalid authorization header'
    });
  }

  const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Decode the access token
    const tokenData = JSON.parse(Buffer.from(accessToken, 'base64').toString());

    // Validate token hasn't expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (tokenData.exp && currentTime > tokenData.exp) {
      return res.status(401).json({
        error: 'token_expired',
        error_description: 'Access token has expired'
      });
    }

    // Return user profile in Circle.so expected format
    const profile = {
      id: tokenData.sub,
      email: tokenData.email,
      name: tokenData.name,
      // Optional fields that Circle.so can use
      avatar_url: tokenData.avatar_url || null,
      organization: tokenData.organization || null,
      role: tokenData.role || 'member'
    };

    console.log(`✅ Profile requested for ${tokenData.email}`);

    res.status(200).json(profile);

  } catch (error) {
    console.error('❌ Profile request failed:', error);
    res.status(401).json({
      error: 'invalid_token',
      error_description: 'Invalid access token'
    });
  }
}