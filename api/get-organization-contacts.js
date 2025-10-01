// api/get-organization-contacts.js - Get team members with role-based permissions
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
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  if (!notionToken || !contactsDbId) {
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
    const currentUserId = session.csc.contact_id;

    console.log(`👥 Fetching team members for: ${session.csc.organization_name}`);

    // Query Notion for all contacts related to this organization
    const contactsResponse = await fetch(`https://api.notion.com/v1/databases/${contactsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        filter: {
          property: 'Organization',
          relation: {
            contains: organizationId
          }
        },
        sorts: [
          {
            property: 'Primary Contact',
            direction: 'descending'
          },
          {
            property: 'Name',
            direction: 'ascending'
          }
        ]
      })
    });

    if (!contactsResponse.ok) {
      throw new Error(`Notion API error: ${contactsResponse.status}`);
    }

    const contactsData = await contactsResponse.json();

    // Map contacts to team member format with permissions
    const teamMembers = contactsData.results.map(contact => {
      const isPrimary = contact.properties['Primary Contact']?.checkbox || false;
      const contactId = contact.id;
      const isCurrentUser = contactId === currentUserId;

      // Determine edit permissions
      // Primary contact can edit anyone
      // Regular members can only edit themselves
      const canEdit = userRole === 'primary' || isCurrentUser;

      // Only primary contact can change who is primary
      const canChangePrimary = userRole === 'primary' && !isPrimary;

      return {
        id: contactId,
        name: contact.properties.Name?.title?.[0]?.text?.content || '',
        email: contact.properties['Work Email']?.email || '',
        phone: contact.properties['Work Phone']?.phone_number || '',
        title: contact.properties.Title?.rich_text?.[0]?.text?.content || '',
        isPrimary: isPrimary,
        isCurrentUser: isCurrentUser,
        canEdit: canEdit,
        canChangePrimary: canChangePrimary
      };
    });

    console.log(`✅ Found ${teamMembers.length} team members`);

    res.status(200).json({
      teamMembers,
      userRole,
      currentUserId
    });

  } catch (error) {
    console.error('❌ Error fetching team members:', error);
    res.status(500).json({ error: 'Failed to load team members', details: error.message });
  }
}
