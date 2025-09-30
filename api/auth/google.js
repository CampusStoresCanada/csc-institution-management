// api/auth/google.js - Google OAuth handler
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Handle OAuth callback
    const { code, state, error } = req.query;

    if (error) {
      console.error('❌ Google OAuth error:', error);
      return res.redirect('/?error=oauth_error');
    }

    if (!code) {
      console.error('❌ No authorization code received');
      return res.redirect('/?error=missing_code');
    }

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: `${process.env.VERCEL_URL || req.headers.host}/api/auth/google`,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }

      const tokens = await tokenResponse.json();

      // Get user info from Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
        },
      });

      if (!userResponse.ok) {
        throw new Error(`User info fetch failed: ${userResponse.status}`);
      }

      const googleUser = await userResponse.json();
      console.log('✅ Google user authenticated:', googleUser.email);

      // Find or create user in our identity system
      const user = await findOrCreateUser(googleUser);

      if (!user.organizationId) {
        // User not associated with any organization
        return res.redirect('/link-organization?google_user=' + encodeURIComponent(JSON.stringify({
          id: googleUser.id,
          email: googleUser.email,
          name: googleUser.name,
          picture: googleUser.picture
        })));
      }

      // Create session token
      const sessionToken = createSessionToken(user);

      // Redirect to management interface
      res.redirect(`/manage?session=${sessionToken}`);

    } catch (error) {
      console.error('❌ OAuth process failed:', error);
      res.redirect('/?error=oauth_failed');
    }

  } else if (req.method === 'POST') {
    // Initiate OAuth flow
    const googleAuthUrl = buildGoogleAuthUrl(req.headers.host);
    res.json({ authUrl: googleAuthUrl });

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

// Build Google OAuth URL
function buildGoogleAuthUrl(host) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: `${host}/api/auth/google`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

// Find or create user in our system
async function findOrCreateUser(googleUser) {
  const notionToken = process.env.NOTION_TOKEN;
  const usersDbId = process.env.NOTION_USERS_DB_ID; // New database for identity mapping
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  // First, check if user already exists in our identity system
  // TODO: Query NOTION_USERS_DB_ID for google_account_id

  // For now, try to find by work email in contacts
  // This is a simplified version - we'll enhance this

  try {
    // Search contacts by work email (we'll need to map Google email to work email)
    // For MVP, we'll handle this in the organization linking step

    return {
      googleId: googleUser.id,
      googleEmail: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      organizationId: null, // Will be set during organization linking
      workEmail: null,
      role: 'member'
    };

  } catch (error) {
    console.error('❌ Error finding/creating user:', error);
    throw error;
  }
}

// Create session token
function createSessionToken(user) {
  const payload = {
    googleId: user.googleId,
    googleEmail: user.googleEmail,
    name: user.name,
    organizationId: user.organizationId,
    workEmail: user.workEmail,
    role: user.role,
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}