// api/circle-auth/authorize.js - OAuth Authorization endpoint for Circle.so
export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Handle authorization request from Circle.so
    const { client_id, redirect_uri, state, response_type } = req.query;

    // Basic validation
    if (!client_id || !redirect_uri || response_type !== 'code') {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'Missing or invalid OAuth parameters'
      });
    }

    // Validate client_id (Circle.so configuration)
    const expectedClientId = process.env.CIRCLE_CLIENT_ID;
    if (client_id !== expectedClientId) {
      return res.status(401).json({
        error: 'unauthorized_client',
        error_description: 'Invalid client_id'
      });
    }

    // Store OAuth state for later validation
    const oauthState = {
      client_id,
      redirect_uri,
      state,
      timestamp: Date.now()
    };

    // Encode state as URL parameter for the login form
    const encodedState = Buffer.from(JSON.stringify(oauthState)).toString('base64');

    // Redirect to login form
    res.redirect(`/circle-login?oauth_state=${encodedState}`);

  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}