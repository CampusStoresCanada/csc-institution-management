// api/verify-circle-user.js - Verify user's Circle.so authentication and map to CSC identity
import { createClient } from '@circleco/headless-server-sdk';

export default async function handler(req, res) {
  console.log('🚀 verify-circle-user API called');
  console.log('📋 Method:', req.method);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    console.log('✅ OPTIONS request handled');
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    console.log('❌ Invalid method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      error: 'Email is required',
      message: 'Please provide your Circle.so email address'
    });
    return;
  }

  const circleApiToken = process.env.CIRCLE_API_TOKEN;
  const notionToken = process.env.NOTION_TOKEN;
  const contactsDbId = process.env.NOTION_CONTACTS_DB_ID;

  console.log('🔧 Environment variables check:', {
    circleApiToken: circleApiToken ? 'SET' : 'MISSING',
    notionToken: notionToken ? 'SET' : 'MISSING',
    contactsDbId: contactsDbId ? 'SET' : 'MISSING'
  });

  if (!circleApiToken || !notionToken || !contactsDbId) {
    console.error('❌ Missing environment variables for Circle verification');
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  try {
    console.log(`🔍 Verifying Circle.so user: ${email}`);

    // Step 1: Initialize Circle.so SDK client
    const circleClient = createClient({ appToken: circleApiToken });

    // Step 2: Get user's Circle.so authentication token using SDK
    let circleAuth;
    try {
      circleAuth = await circleClient.getMemberAPITokenFromEmail(email);
      console.log('✅ Circle.so authentication successful');
    } catch (circleError) {
      console.error('❌ Circle.so authentication failed:', circleError);

      // Check if it's a 404 (user not found)
      if (circleError.message && circleError.message.includes('404')) {
        res.status(404).json({
          error: 'User not found in Circle.so community',
          message: 'Please make sure you have joined the Campus Stores Canada community on Circle.so first.'
        });
      } else {
        res.status(401).json({
          error: 'Circle.so authentication failed',
          message: 'Could not verify your Circle.so membership. Please try again.'
        });
      }
      return;
    }

    const { access_token: circleAccessToken, community_member_id, community_id } = circleAuth;

    if (!circleAccessToken) {
      res.status(401).json({
        error: 'No access token received',
        message: 'Circle.so authentication did not return a valid token.'
      });
      return;
    }

    // Step 3: Get user's Circle.so profile using the access token
    console.log('👤 Fetching Circle.so profile with access token');
    const profileResponse = await fetch('https://app.circle.so/api/headless/v1/me', {
      headers: {
        'Authorization': `Bearer ${circleAccessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!profileResponse.ok) {
      const profileErrorText = await profileResponse.text();
      console.error('❌ Circle.so profile fetch failed:', profileResponse.status, profileErrorText);
      throw new Error(`Failed to get Circle.so profile: ${profileResponse.status}`);
    }

    const circleProfile = await profileResponse.json();
    const circleUser = circleProfile.member;

    console.log(`✅ Circle.so user verified: ${circleUser.name} (${circleUser.email})`);

    // Step 4: Map Circle.so user to Notion contact
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
      throw new Error(`Notion contact lookup failed: ${contactResponse.status}`);
    }

    const contactData = await contactResponse.json();

    if (contactData.results.length === 0) {
      res.status(404).json({
        error: 'Work email not found in CSC database',
        message: `Your Circle.so email (${email}) is not associated with any Campus Stores Canada organization. Please contact steve@campusstores.ca to link your accounts.`
      });
      return;
    }

    const contact = contactData.results[0];
    const contactName = contact.properties.Name?.title?.[0]?.text?.content || circleUser.name;
    const isPrimary = contact.properties['Primary Contact']?.checkbox || false;
    const organizationRelations = contact.properties.Organization?.relation || [];

    // Step 5: Get organization details
    let organizationName = 'Campus Stores Canada';
    let organizationId = null;

    if (organizationRelations.length > 0) {
      try {
        organizationId = organizationRelations[0].id;
        const orgResponse = await fetch(`https://api.notion.com/v1/pages/${organizationId}`, {
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

    // Step 6: Generate CSC session token
    const cscSession = generateCSCSession({
      circleUserId: circleUser.id,
      circleEmail: circleUser.email,
      circleName: circleUser.name,
      circleAvatar: circleUser.avatar_url,
      circleAccessToken: circleAccessToken,
      circleMemberId: community_member_id,
      circleCommunityId: community_id,
      cscContactId: contact.id,
      cscContactName: contactName,
      cscWorkEmail: email,
      cscOrganizationId: organizationId,
      cscOrganizationName: organizationName,
      cscRole: isPrimary ? 'primary' : 'member'
    });

    console.log(`✅ CSC session created for ${contactName} (${organizationName}) - Role: ${isPrimary ? 'primary' : 'member'}`);

    res.status(200).json({
      success: true,
      message: 'Authentication verified successfully',
      session_token: cscSession,
      user: {
        circle: {
          id: circleUser.id,
          name: circleUser.name,
          email: circleUser.email,
          avatar_url: circleUser.avatar_url,
          community_member_id: community_member_id,
          community_id: community_id
        },
        csc: {
          contact_name: contactName,
          work_email: email,
          organization: organizationName,
          role: isPrimary ? 'primary' : 'member'
        }
      }
    });

  } catch (error) {
    console.error('❌ Circle.so verification failed:', error);
    res.status(500).json({
      error: 'Verification failed',
      message: 'There was a problem verifying your Circle.so membership. Please try again or contact steve@campusstores.ca for assistance.',
      details: error.message
    });
  }
}

// Generate CSC session token with both Circle and Notion context
function generateCSCSession(userData) {
  const payload = {
    // Circle.so identity
    circle: {
      user_id: userData.circleUserId,
      email: userData.circleEmail,
      name: userData.circleName,
      avatar_url: userData.circleAvatar,
      access_token: userData.circleAccessToken,
      community_member_id: userData.circleMemberId,
      community_id: userData.circleCommunityId
    },
    // CSC/Notion identity
    csc: {
      contact_id: userData.cscContactId,
      contact_name: userData.cscContactName,
      work_email: userData.cscWorkEmail,
      organization_id: userData.cscOrganizationId,
      organization_name: userData.cscOrganizationName,
      role: userData.cscRole
    },
    // Session metadata
    issued: Date.now(),
    expires: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
    issuer: 'csc-institution-management'
  };

  return Buffer.from(JSON.stringify(payload)).toString('base64');
}
