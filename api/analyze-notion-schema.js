// api/analyze-notion-schema.js - Get full database schema for analysis
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

  const sessionToken = authHeader.substring(7);

  const notionToken = process.env.NOTION_TOKEN;
  const organizationsDbId = process.env.NOTION_ORGANIZATIONS_DB_ID;
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  if (!notionToken || !organizationsDbId || !contactsDbId) {
    console.error('❌ Missing environment variables!');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    // Decode and validate session token
    const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString());

    if (session.expires && Date.now() > session.expires) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    // Get Organization Database Schema
    const orgDbResponse = await fetch(`https://api.notion.com/v1/databases/${organizationsDbId}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });

    if (!orgDbResponse.ok) {
      throw new Error(`Notion API error for Organizations DB: ${orgDbResponse.status}`);
    }

    const orgDb = await orgDbResponse.json();

    // Get Contacts Database Schema
    const contactsDbResponse = await fetch(`https://api.notion.com/v1/databases/${contactsDbId}`, {
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      }
    });

    if (!contactsDbResponse.ok) {
      throw new Error(`Notion API error for Contacts DB: ${contactsDbResponse.status}`);
    }

    const contactsDb = await contactsDbResponse.json();

    // Query a few organizations to see actual data patterns
    const orgQueryResponse = await fetch(`https://api.notion.com/v1/databases/${organizationsDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        page_size: 10
      })
    });

    if (!orgQueryResponse.ok) {
      throw new Error(`Notion API error querying organizations: ${orgQueryResponse.status}`);
    }

    const orgQueryData = await orgQueryResponse.json();

    // Analyze property usage by organization type
    const memberOrgs = [];
    const partnerOrgs = [];

    orgQueryData.results.forEach(org => {
      const orgType = org.properties['Organization Type']?.select?.name ||
                      org.properties['Type']?.select?.name ||
                      org.properties['Member Type']?.select?.name;

      const orgData = {
        name: org.properties.Organization?.title?.[0]?.text?.content || 'Unnamed',
        type: orgType,
        properties: Object.keys(org.properties).reduce((acc, key) => {
          const prop = org.properties[key];
          let value = null;

          // Extract value based on property type
          if (prop.title?.[0]) value = prop.title[0].text.content;
          else if (prop.rich_text?.[0]) value = prop.rich_text[0].text.content;
          else if (prop.select) value = prop.select.name;
          else if (prop.multi_select) value = prop.multi_select.map(s => s.name);
          else if (prop.url) value = prop.url;
          else if (prop.email) value = prop.email;
          else if (prop.phone_number) value = prop.phone_number;
          else if (prop.checkbox) value = prop.checkbox;
          else if (prop.relation) value = `[${prop.relation.length} relations]`;

          if (value !== null && value !== '' && value !== false) {
            acc[key] = value;
          }
          return acc;
        }, {})
      };

      if (orgType === 'Member') {
        memberOrgs.push(orgData);
      } else if (orgType === 'Partner') {
        partnerOrgs.push(orgData);
      }
    });

    res.status(200).json({
      organizationsDatabase: {
        title: orgDb.title?.[0]?.plain_text || 'Organizations',
        properties: Object.keys(orgDb.properties).map(key => ({
          name: key,
          type: orgDb.properties[key].type,
          ...(orgDb.properties[key].select && {
            options: orgDb.properties[key].select.options.map(o => o.name)
          }),
          ...(orgDb.properties[key].multi_select && {
            options: orgDb.properties[key].multi_select.options.map(o => o.name)
          })
        }))
      },
      contactsDatabase: {
        title: contactsDb.title?.[0]?.plain_text || 'Contacts',
        properties: Object.keys(contactsDb.properties).map(key => ({
          name: key,
          type: contactsDb.properties[key].type,
          ...(contactsDb.properties[key].select && {
            options: contactsDb.properties[key].select.options.map(o => o.name)
          }),
          ...(contactsDb.properties[key].multi_select && {
            options: contactsDb.properties[key].multi_select.options.map(o => o.name)
          })
        }))
      },
      sampleData: {
        memberOrganizations: memberOrgs,
        partnerOrganizations: partnerOrgs
      }
    });

  } catch (error) {
    console.error('❌ Error analyzing schema:', error);
    res.status(500).json({ error: 'Failed to analyze schema', details: error.message });
  }
}
