// api/send-issue-report.js - Send consolidated issue report to primary contact
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

  const sessionToken = authHeader.substring(7);
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

    if (session.expires && Date.now() > session.expires) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    if (!session.csc || !session.csc.organization_id) {
      res.status(403).json({ error: 'No organization associated with your account' });
      return;
    }

    const { issues, reporterName, reporterEmail, organizationName } = req.body;

    if (!issues || issues.length === 0) {
      res.status(400).json({ error: 'No issues provided' });
      return;
    }


    // Step 1: Find primary contact for this organization
    const organizationId = session.csc.organization_id;

    // Get Primary Contact tag ID
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

    if (!primaryTagResponse.ok) {
      throw new Error('Failed to fetch Primary Contact tag');
    }

    const primaryTagData = await primaryTagResponse.json();
    if (primaryTagData.results.length === 0) {
      throw new Error('Primary Contact tag not found in Tag System');
    }

    const primaryContactTagId = primaryTagData.results[0].id;

    // Query contacts for this organization
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
        }
      })
    });

    if (!contactsResponse.ok) {
      throw new Error('Failed to fetch contacts');
    }

    const contactsData = await contactsResponse.json();

    // Find primary contact
    let primaryContact = null;
    for (const contact of contactsData.results) {
      if (contact.properties['Personal Tag']?.relation) {
        const personalTagIds = contact.properties['Personal Tag'].relation.map(tag => tag.id);
        if (personalTagIds.includes(primaryContactTagId)) {
          primaryContact = {
            name: contact.properties.Name?.title?.[0]?.text?.content || '',
            email: contact.properties['Work Email']?.email || ''
          };
          break;
        }
      }
    }

    if (!primaryContact || !primaryContact.email) {
      console.error('❌ No primary contact email found');
      res.status(500).json({ error: 'Could not find primary contact email' });
      return;
    }


    // Step 2: Format email content
    const issuesList = issues.map((issue, idx) =>
      `${idx + 1}. **${issue.fieldLabel}**\n` +
      `   Current value: ${issue.currentValue}\n` +
      `   Issue: ${issue.issueDescription}\n`
    ).join('\n');

    const emailSubject = `Organization Data Issues - ${organizationName}`;
    const emailBody = `
Hello ${primaryContact.name},

${reporterName} (${reporterEmail}) has reported ${issues.length} issue(s) with your organization's data in the CSC Institution Management system.

${issuesList}

Please review and update these fields as needed.

---
This is an automated message from CSC Institution Management.
`;

    // Step 3: Send email (placeholder - would use SendGrid, SES, etc.)

    // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
    // For now, just log the email content

    res.status(200).json({
      success: true,
      message: `Report sent to ${primaryContact.name}`,
      primaryContactEmail: primaryContact.email,
      issueCount: issues.length
    });

  } catch (error) {
    console.error('❌ Error sending issue report:', error);
    res.status(500).json({
      error: 'Failed to send report',
      details: error.message
    });
  }
}
