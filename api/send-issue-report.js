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
    const issuesListHTML = issues.map((issue, idx) =>
      `<tr>
        <td style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
          <strong style="color: #0071bc; font-size: 16px;">${issue.fieldLabel}</strong><br>
          <span style="color: #666; font-size: 14px;">Current value: ${issue.currentValue}</span><br>
          <span style="color: #333; font-size: 14px; margin-top: 5px; display: block;">Issue: ${issue.issueDescription}</span>
        </td>
      </tr>`
    ).join('');

    const emailSubject = `Organization Data Issues - ${organizationName}`;
    const emailBodyHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <img src="https://images.squarespace-cdn.com/content/v1/5ec55d5d28a93e0e18d2eeb4/1600096854522-HS7NUI12I1ML6SPJFLLY/Artboard+1.png?format=300w"
         alt="Campus Stores Canada"
         style="width: 80px; height: 80px; object-fit: contain;">
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #0071bc; margin: 0 0 10px 0;">Organization Data Issues</h2>
    <p style="margin: 0; color: #666;">Hello ${primaryContact.name},</p>
  </div>

  <p style="font-size: 16px; color: #333;">
    <strong>${reporterName}</strong> (${reporterEmail}) has reported <strong>${issues.length} issue(s)</strong> with your organization's data in the CSC Institution Management system.
  </p>

  <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; margin: 20px 0;">
    ${issuesListHTML}
  </table>

  <div style="text-align: center; margin: 30px 0;">
    <a href="https://csc-institution-management.vercel.app/manage"
       style="display: inline-block; background: #0071bc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 16px;">
      Review and Update Information
    </a>
  </div>

  <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 8px; color: #666; font-size: 12px; line-height: 1.8;">
    <p style="margin: 0 0 10px 0; color: #333; font-weight: 500;">You received this email from Campus Stores Canada</p>
    <p style="margin: 0 0 10px 0;">P.O. Box 71157, Silver Springs<br>Calgary, Alberta T3G 5K2</p>
    <p style="margin: 0 0 10px 0;">
      If you believe you have received this email in error, please contact us at
      <a href="mailto:info@campusstores.ca" style="color: #0071bc; text-decoration: none;">info@campusstores.ca</a>
    </p>
    <p style="margin: 10px 0 0 0; padding-top: 10px; border-top: 1px solid #e0e0e0; color: #999; font-size: 11px;">
      This is an automated notification from the CSC Institution Management system. You are receiving this because you are listed as the primary contact for ${organizationName}.
    </p>
  </div>
</body>
</html>`;

    const emailBodyText = `
Hello ${primaryContact.name},

${reporterName} (${reporterEmail}) has reported ${issues.length} issue(s) with your organization's data in the CSC Institution Management system.

${issues.map((issue, idx) =>
  `${idx + 1}. ${issue.fieldLabel}\n   Current value: ${issue.currentValue}\n   Issue: ${issue.issueDescription}`
).join('\n\n')}

Review and update: https://csc-institution-management.vercel.app/manage

---
You received this email from Campus Stores Canada
P.O. Box 71157, Silver Springs
Calgary, Alberta T3G 5K2

If you believe you have received this email in error, please contact us at info@campusstores.ca

This is an automated notification from the CSC Institution Management system. You are receiving this because you are listed as the primary contact for ${organizationName}.
`;

    // Step 3: Send email via AWS SES
    const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses');

    const sesClient = new SESClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });

    const sendEmailCommand = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL || 'google@campusstores.ca',
      Destination: {
        ToAddresses: ['google@campusstores.ca'] // TEMP: Testing - normally primaryContact.email
      },
      Message: {
        Subject: {
          Data: emailSubject,
          Charset: 'UTF-8'
        },
        Body: {
          Html: {
            Data: emailBodyHTML,
            Charset: 'UTF-8'
          },
          Text: {
            Data: emailBodyText,
            Charset: 'UTF-8'
          }
        }
      }
    });

    await sesClient.send(sendEmailCommand);

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
