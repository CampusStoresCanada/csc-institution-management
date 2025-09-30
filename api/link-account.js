// api/link-account.js - Link Google account to work organization
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

  const { googleUser, organizationName, workEmail } = req.body;

  if (!googleUser || !organizationName || !workEmail) {
    res.status(400).json({ error: 'Google user, organization name, and work email are required' });
    return;
  }

  const notionToken = process.env.NOTION_TOKEN;
  const organizationsDbId = process.env.NOTION_ORGANIZATIONS_DB_ID;
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  if (!notionToken || !organizationsDbId || !contactsDbId) {
    console.error('❌ Missing environment variables for account linking');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    console.log(`🔗 Linking Google account ${googleUser.email} to ${workEmail} at ${organizationName}`);

    // Step 1: Find organization by name
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
      throw new Error(`Organization query failed: ${orgResponse.status}`);
    }

    const orgData = await orgResponse.json();

    if (orgData.results.length === 0) {
      res.status(404).json({
        error: 'Organization not found',
        message: `We could not find an organization matching "${organizationName}". Please check the spelling or contact steve@campusstores.ca for assistance.`
      });
      return;
    }

    const organization = orgData.results[0];
    const orgId = organization.id;
    const orgName = organization.properties.Organization?.title?.[0]?.text?.content || organizationName;

    console.log(`✅ Found organization: ${orgName} (ID: ${orgId})`);

    // Step 2: Verify work email exists in contacts for this organization
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
              property: 'Work Email',
              email: { equals: workEmail }
            }
          ]
        }
      })
    });

    if (!contactResponse.ok) {
      const errorText = await contactResponse.text();
      console.error('❌ Contact verification error:', contactResponse.status, errorText);
      throw new Error(`Contact verification failed: ${contactResponse.status}`);
    }

    const contactData = await contactResponse.json();

    if (contactData.results.length === 0) {
      res.status(403).json({
        error: 'Work email not found',
        message: `The email ${workEmail} is not associated with ${orgName}. Please use an email address that's registered with your organization or contact steve@campusstores.ca for assistance.`
      });
      return;
    }

    const contact = contactData.results[0];
    const contactName = contact.properties.Name?.title?.[0]?.text?.content || 'Team Member';
    const isPrimary = contact.properties['Primary Contact']?.checkbox || false;

    console.log(`✅ Verified contact: ${contactName} (Primary: ${isPrimary})`);

    // Step 3: Create or update user identity mapping
    // For now, we'll create a session token. In the future, this would create/update a Users database record
    const sessionToken = createSessionToken({
      googleId: googleUser.id,
      googleEmail: googleUser.email,
      name: googleUser.name,
      picture: googleUser.picture,
      organizationId: orgId,
      organizationName: orgName,
      workEmail: workEmail,
      contactName: contactName,
      role: isPrimary ? 'primary' : 'member'
    });

    console.log(`✅ Created session for ${contactName} with role: ${isPrimary ? 'primary' : 'member'}`);

    res.status(200).json({
      success: true,
      message: `Successfully linked ${googleUser.name} to ${orgName}`,
      sessionToken: sessionToken,
      user: {
        name: contactName,
        organization: orgName,
        role: isPrimary ? 'primary' : 'member'
      }
    });

  } catch (error) {
    console.error('❌ Account linking failed:', error);
    res.status(500).json({
      error: 'Failed to link account',
      message: 'There was a problem linking your Google account to your organization. Please try again or contact steve@campusstores.ca for assistance.',
      details: error.message
    });
  }
}

// Create session token with user and organization context
function createSessionToken(user) {
  const payload = {
    googleId: user.googleId,
    googleEmail: user.googleEmail,
    name: user.name,
    picture: user.picture,
    organizationId: user.organizationId,
    organizationName: user.organizationName,
    workEmail: user.workEmail,
    contactName: user.contactName,
    role: user.role,
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}