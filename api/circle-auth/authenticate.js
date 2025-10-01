// api/circle-auth/authenticate.js - Handle user authentication for Circle.so OAuth
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email, oauth_state } = req.body;

  if (!email || !oauth_state) {
    res.status(400).json({ error: 'Email and OAuth state are required' });
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;
  const organizationsDbId = process.env.NOTION_ORGANIZATIONS_DB_ID;

  if (!notionToken || !contactsDbId || !organizationsDbId) {
    console.error('❌ Missing environment variables for Circle authentication');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Decode OAuth state
    const stateData = JSON.parse(Buffer.from(oauth_state, 'base64').toString());

    // Validate OAuth state hasn't expired (5 minutes)
    const stateAge = Date.now() - stateData.timestamp;
    if (stateAge > 5 * 60 * 1000) {
      return res.status(400).json({
        error: 'OAuth request has expired. Please try again.'
      });
    }

    console.log(`🔍 Circle.so authentication attempt for ${email}`);

    // Find user in contacts database
    const contactResponse = await fetch(`https://api.notion.com/v1/databases/${contactsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Work Email',
          email: { equals: email }
        }
      })
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('❌ Contact lookup failed:', contactResponse.status, errorText);
      throw new Error('Failed to verify user credentials');
    }

    const contactData = await contactResponse.json();

    if (contactData.results.length === 0) {
      res.status(403).json({
        error: `The email ${email} is not registered with Campus Stores Canada. Please check your email address or contact steve@campusstores.ca for assistance.`
      });
      return;
    }

    const contact = contactData.results[0];
    const contactName = contact.properties.Name?.title?.[0]?.text?.content || 'CSC Member';
    const isPrimary = contact.properties['Primary Contact']?.checkbox || false;
    const organizationRelations = contact.properties.Organization?.relation || [];

    // Get organization details
    let organizationName = 'Campus Stores Canada';
    if (organizationRelations.length > 0) {
      try {
        const orgResponse = await fetch(`https://api.notion.com/v1/pages/${organizationRelations[0].id}`, {
          headers: {
            'Authorization': `Bearer ${notionToken}`,
            'Notion-Version': '2022-06-28'
          }
        });

        if (orgResponse.ok) {
          const orgData = await orgResponse.json();
          organizationName = orgData.properties.Organization?.title?.[0]?.text?.content || organizationName;
        }
      } catch (orgError) {
        console.warn('⚠️ Could not fetch organization details:', orgError);
      }
    }

    // Create user info for authorization code
    const userInfo = {
      userId: contact.id,
      email: email,
      name: contactName,
      organization: organizationName,
      role: isPrimary ? 'primary' : 'member',
      timestamp: Date.now()
    };

    // Generate authorization code (contains user info)
    const authCode = Buffer.from(JSON.stringify(userInfo)).toString('base64');

    // Build redirect URL back to Circle.so
    const redirectParams = new URLSearchParams({
      code: authCode,
      state: stateData.state || ''
    });

    const redirectUrl = `${stateData.redirect_uri}?${redirectParams.toString()}`;

    console.log(`✅ Circle.so authentication successful for ${contactName} (${organizationName})`);

    res.status(200).json({
      success: true,
      redirect_url: redirectUrl,
      user: {
        name: contactName,
        organization: organizationName,
        role: isPrimary ? 'primary' : 'member'
      }
    });

  } catch (error) {
    console.error('❌ Circle.so authentication failed:', error);
    res.status(500).json({
      error: 'Authentication failed. Please try again or contact steve@campusstores.ca for assistance.'
    });
  }
}