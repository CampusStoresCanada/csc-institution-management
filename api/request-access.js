// api/request-access.js - Handle organization lookup and access token email
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: `Method ${req.method} not allowed, expected POST` });
    return;
  }

  const { organizationName, contactEmail } = req.body;

  if (!organizationName || !contactEmail) {
    res.status(400).json({ error: 'Organization name and contact email are required' });
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const organizationsDbId = process.env.NOTION_ORGANIZATIONS_DB_ID;
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  if (!notionToken || !organizationsDbId || !contactsDbId) {
    console.error('❌ Missing environment variables for access request:', {
      notionToken: notionToken ? 'SET' : 'MISSING',
      organizationsDbId: organizationsDbId ? 'SET' : 'MISSING',
      contactsDbId: contactsDbId ? 'SET' : 'MISSING'
    });
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    console.log(`🔍 Looking up organization: "${organizationName}" for email: ${contactEmail}`);

    // Step 1: Find organization by name (fuzzy search)
    const orgResponse = await fetch(`https://api.notion.com/v1/databases/${organizationsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Organization',
          title: { contains: organizationName }
        }
      })
    });

    if (!orgResponse.ok) {
      throw new Error(`Notion organizations query failed: ${orgResponse.status}`);
    }

    const orgData = await orgResponse.json();

    if (orgData.results.length === 0) {
      res.status(404).json({
        error: 'Organization not found',
        message: 'We could not find an organization matching that name. Please check the spelling or contact steve@campusstores.ca for assistance.'
      });
      return;
    }

    // For now, take the first match (we could make this more sophisticated later)
    const organization = orgData.results[0];
    const orgId = organization.id;
    const orgName = organization.properties.Organization?.title?.[0]?.text?.content || organizationName;
    const orgToken = organization.properties.Token?.rich_text?.[0]?.text?.content;

    console.log(`✅ Found organization: ${orgName} (ID: ${orgId})`);

    // Step 2: Check if the email is associated with this organization
    const contactResponse = await fetch(`https://api.notion.com/v1/databases/${contactsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          and: [
            {
              property: 'Organization',
              relation: { contains: orgId }
            },
            {
              property: 'Email',
              email: { equals: contactEmail }
            }
          ]
        }
      })
    });

    if (!contactResponse.ok) {
      throw new Error(`Notion contacts query failed: ${contactResponse.status}`);
    }

    const contactData = await contactResponse.json();

    if (contactData.results.length === 0) {
      res.status(403).json({
        error: 'Email not associated with organization',
        message: `The email ${contactEmail} is not associated with ${orgName}. Please use an email address that's registered with your organization or contact steve@campusstores.ca for assistance.`
      });
      return;
    }

    const contact = contactData.results[0];
    const contactName = contact.properties.Name?.title?.[0]?.text?.content || 'Team Member';
    const isPrimary = contact.properties['Primary Contact']?.checkbox || false;

    console.log(`✅ Found contact: ${contactName} (Primary: ${isPrimary})`);

    // Step 3: Generate secure access token (for now, use existing org token with expiry)
    const accessToken = generateSecureToken(orgToken, contactEmail, isPrimary);

    // Step 4: Send email (placeholder for now)
    console.log(`📧 Would send email to ${contactEmail} with access link`);
    console.log(`🔗 Access link: ${req.headers.host}/manage?token=${accessToken}&expires=${Date.now() + 24*60*60*1000}`);

    // TODO: Implement actual email sending
    // For now, return success with token for testing
    res.status(200).json({
      success: true,
      message: `Access link sent to ${contactEmail}! Check your email for the secure management link.`,
      // Remove these in production:
      debug: {
        organization: orgName,
        contact: contactName,
        isPrimary: isPrimary,
        accessToken: accessToken
      }
    });

  } catch (error) {
    console.error('❌ Access request failed:', error);
    res.status(500).json({
      error: 'Failed to process access request',
      message: 'There was a problem looking up your organization. Please try again or contact steve@campusstores.ca for assistance.',
      details: error.message
    });
  }
}

// Generate a secure access token
function generateSecureToken(orgToken, email, isPrimary) {
  // For now, create a simple encoded token
  // In production, use proper JWT or similar
  const payload = {
    orgToken: orgToken,
    email: email,
    isPrimary: isPrimary,
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}