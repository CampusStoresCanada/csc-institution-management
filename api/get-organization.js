// api/get-organization.js - Get organization data with session authentication
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: `Method ${req.method} not allowed, expected GET` });
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
  const organizationsDbId = process.env.NOTION_ORGANIZATIONS_DB_ID;

  if (!notionToken || !organizationsDbId) {
    console.error('❌ Missing environment variables!');
    res.status(500).json({ error: 'Server configuration error' });
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

    // Check if user has access to organization data
    if (!session.csc || !session.csc.organization_id) {
      res.status(403).json({ error: 'No organization associated with your account' });
      return;
    }

    const organizationId = session.csc.organization_id;
    const userRole = session.csc.role; // 'primary' or 'member'

    console.log(`📋 Fetching organization data for: ${session.csc.organization_name}`);

    // Fetch organization details from Notion
    const orgResponse = await fetch(`https://api.notion.com/v1/pages/${organizationId}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });

    if (!orgResponse.ok) {
      throw new Error(`Notion API error: ${orgResponse.status}`);
    }

    const org = await orgResponse.json();

    // Extract organization data
    const organizationData = {
      id: org.id,
      name: org.properties.Organization?.title?.[0]?.text?.content || '',
      website: org.properties.Website?.url || '',
      institutionSize: org.properties['Institution Size']?.select?.name || '',
      address: {
        streetAddress: org.properties['Street Address']?.rich_text?.[0]?.text?.content || '',
        city: org.properties['City']?.rich_text?.[0]?.text?.content || '',
        province: org.properties['Province']?.select?.name || '',
        postalCode: org.properties['Postal Code']?.rich_text?.[0]?.text?.content || ''
      },
      // User permissions
      canEdit: userRole === 'primary',
      userRole: userRole
    };

    // Institution size options for dropdown
    const institutionSizeOptions = [
      { value: 'XSmall', label: 'XSmall (< 2,000 FTE)' },
      { value: 'Small', label: 'Small (2,001 - 5,000 FTE)' },
      { value: 'Medium', label: 'Medium (5,001 - 10,000 FTE)' },
      { value: 'Large', label: 'Large (10,001 - 15,000 FTE)' },
      { value: 'XLarge', label: 'XLarge (> 15,001 FTE)' }
    ];

    // Province options for dropdown
    const provinceOptions = [
      { value: 'Alberta', label: 'Alberta' },
      { value: 'British Columbia', label: 'British Columbia' },
      { value: 'Manitoba', label: 'Manitoba' },
      { value: 'New Brunswick', label: 'New Brunswick' },
      { value: 'Newfoundland and Labrador', label: 'Newfoundland and Labrador' },
      { value: 'Northwest Territories', label: 'Northwest Territories' },
      { value: 'Nova Scotia', label: 'Nova Scotia' },
      { value: 'Nunavut', label: 'Nunavut' },
      { value: 'Ontario', label: 'Ontario' },
      { value: 'Prince Edward Island', label: 'Prince Edward Island' },
      { value: 'Quebec', label: 'Quebec' },
      { value: 'Saskatchewan', label: 'Saskatchewan' },
      { value: 'Yukon', label: 'Yukon' },
      { value: 'Out of Canada', label: 'Out of Canada' }
    ];

    console.log(`✅ Organization data fetched successfully`);

    res.status(200).json({
      organization: organizationData,
      institutionSizeOptions,
      provinceOptions
    });

  } catch (error) {
    console.error('❌ Error fetching organization data:', error);
    res.status(500).json({ error: 'Failed to load organization data', details: error.message });
  }
}
