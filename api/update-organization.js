// api/update-organization.js - Update organization details in Notion (Primary contact only)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get session token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No session token provided' });
    return;
  }

  const sessionToken = authHeader.substring(7); // Remove 'Bearer '

  const notionToken = process.env.NOTION_TOKEN;

  if (!notionToken) {
    console.error('❌ Missing environment variables!');
    res.status(500).json({ error: 'Missing configuration' });
    return;
  }

  try {
    // Decode and validate session token
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

    // Check if session is expired
    if (session.expires && Date.now() > session.expires) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    // PERMISSION CHECK: Only primary contact can update organization
    if (session.csc.role !== 'primary') {
      res.status(403).json({ error: 'Only the primary contact can update organization details' });
      return;
    }

    const { organizationUpdates } = req.body;
    const organizationId = session.csc.organization_id;
    const organizationName = session.csc.organization_name;


    // Step 2: Build update payload
    const updateData = {
      properties: {}
    };

    // Update organization name
    if (organizationUpdates.institutionName) {
      updateData.properties["Organization"] = {
        title: [{ text: { content: organizationUpdates.institutionName } }]
      };
    }

    // Update website
    if (organizationUpdates.website) {
      updateData.properties["Website"] = {
        url: organizationUpdates.website
      };
    }

    // Update institution size
    if (organizationUpdates.institutionSize) {
      updateData.properties["Institution Size"] = {
        select: { name: organizationUpdates.institutionSize }
      };
    }

    // Update address fields
    if (organizationUpdates.address) {
      const address = organizationUpdates.address;

      if (address.streetAddress) {
        updateData.properties["Street Address"] = {
          rich_text: [{ text: { content: address.streetAddress } }]
        };
      }

      if (address.city) {
        updateData.properties["City"] = {
          rich_text: [{ text: { content: address.city } }]
        };
      }

      if (address.province) {
        updateData.properties["Province"] = {
          select: { name: address.province }
        };
      }

      if (address.postalCode) {
        updateData.properties["Postal Code"] = {
          rich_text: [{ text: { content: address.postalCode } }]
        };
      }

    }

    // Step 3: Apply updates to Notion
    if (Object.keys(updateData.properties).length === 0) {
      res.status(200).json({
        success: true,
        message: 'No changes detected',
        organizationId: organizationId
      });
      return;
    }


    const updateResponse = await fetch(`https://api.notion.com/v1/pages/${organizationId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify(updateData)
    });

    if (!updateResponse.ok) {
      const errorData = await updateResponse.json();
      console.error('❌ Notion update failed:', errorData);
      throw new Error(`Notion API error: ${errorData.message}`);
    }

    const updatedOrg = await updateResponse.json();

    res.status(200).json({
      success: true,
      organizationId: organizationId,
      updatedProperties: Object.keys(updateData.properties),
      message: `Updated ${Object.keys(updateData.properties).length} organization properties`
    });

  } catch (error) {
    console.error('💥 Error updating organization:', error);
    res.status(500).json({
      error: 'Failed to update organization',
      details: error.message
    });
  }
}