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
  const tagSystemDbId = process.env.NOTION_TAG_SYSTEM_DB_ID || '1f9a69bf0cfd8034b919f51b7c4f2c67';

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


    // Step 2: Get special tag IDs from Tag System
    let primaryContactTagId = null;
    let conferenceDelegateTagId = null;

    try {
      // Get Primary Contact tag
      const primaryTagResponse = await fetch(`https://api.notion.com/v1/databases/${tagSystemDbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            property: 'Name',
            title: { equals: 'Primary Contact' }
          }
        })
      });

      if (primaryTagResponse.ok) {
        const primaryTagData = await primaryTagResponse.json();
        if (primaryTagData.results.length > 0) {
          primaryContactTagId = primaryTagData.results[0].id;
        } else {
          console.warn('⚠️ Primary Contact tag not found in Tag System');
        }
      }

      // Get Conference Delegate tag
      const conferenceTagResponse = await fetch(`https://api.notion.com/v1/databases/${tagSystemDbId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notionToken}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        },
        body: JSON.stringify({
          filter: {
            property: 'Name',
            title: { equals: '26 Conference Delegate' }
          }
        })
      });

      if (conferenceTagResponse.ok) {
        const conferenceTagData = await conferenceTagResponse.json();
        if (conferenceTagData.results.length > 0) {
          conferenceDelegateTagId = conferenceTagData.results[0].id;
        } else {
          console.warn('⚠️ Conference Delegate tag not found in Tag System');
        }
      }
    } catch (tagError) {
      console.error('❌ Error fetching tags:', tagError);
    }

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
            property: 'Name',
            direction: 'ascending'
          }
        ]
      })
    });

    if (!contactsResponse.ok) {
      const errorText = await contactsResponse.text();
      console.error('❌ Notion API error:', contactsResponse.status, errorText);
      throw new Error(`Notion API error: ${contactsResponse.status} - ${errorText}`);
    }

    const contactsData = await contactsResponse.json();

    // Map contacts to team member format with permissions

    // Log all available properties from first contact to debug
    if (contactsData.results.length > 0) {
    }

    const teamMembers = contactsData.results.map((contact, index) => {
      try {
        // Check for special tags in Personal Tag relation
        let isPrimary = false;
        let isConferenceDelegate = false;

        if (contact.properties['Personal Tag']?.relation) {
          const personalTagIds = contact.properties['Personal Tag'].relation.map(tag => tag.id);

          // Check for Primary Contact tag
          if (primaryContactTagId && personalTagIds.includes(primaryContactTagId)) {
            isPrimary = true;
          }

          // Check for Conference Delegate tag
          if (conferenceDelegateTagId && personalTagIds.includes(conferenceDelegateTagId)) {
            isConferenceDelegate = true;
          }
        }

        const contactId = contact.id;
        const isCurrentUser = contactId === currentUserId;

        // Determine edit permissions
        // Primary contact can edit anyone
        // Regular members can only edit themselves
        const canEdit = userRole === 'primary' || isCurrentUser;

        // Only primary contact can change who is primary
        const canChangePrimary = userRole === 'primary' && !isPrimary;

        const member = {
          id: contactId,
          name: contact.properties.Name?.title?.[0]?.text?.content || '',
          email: contact.properties['Work Email']?.email || '',
          phone: contact.properties['Work Phone Number']?.phone_number || '',
          title: contact.properties['Role/Title']?.rich_text?.[0]?.text?.content || '',
          isPrimary: isPrimary,
          isConferenceDelegate: isConferenceDelegate,
          isCurrentUser: isCurrentUser,
          canEdit: canEdit,
          canChangePrimary: canChangePrimary
        };

        return member;
      } catch (mapError) {
        console.error(`❌ Error mapping contact ${index}:`, mapError, contact);
        throw mapError;
      }
    });

    // Sort with primary contacts first, then alphabetically by name
    teamMembers.sort((a, b) => {
      if (a.isPrimary && !b.isPrimary) return -1;
      if (!a.isPrimary && b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });


    const responseData = {
      contacts: teamMembers, // Frontend expects 'contacts'
      teamMembers: teamMembers, // Also provide as teamMembers for compatibility
      organizationName: session.csc.organization_name,
      userRole,
      currentUserId
    };
    res.status(200).json(responseData);

  } catch (error) {
    console.error('❌ Error fetching team members:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to load team members', details: error.message, stack: error.stack });
  }
}
