# Circle.so Integration Setup (Correct Approach)

This document explains how to set up Circle.so membership verification for CSC tools access.

## Overview

Instead of replacing Circle.so's authentication, this system **piggybacks on existing Circle.so membership** to provide access to CSC tools.

## How It Works

1. **User is already a member** of Circle.so community
2. **User enters their Circle.so email** on CSC tools
3. **System verifies membership** via Circle.so API
4. **System maps Circle account** to Notion contact data
5. **User gets access** to all CSC tools with combined identity

## Environment Variables Required

Add these to your Vercel project:

```
# Existing Notion variables
NOTION_TOKEN=your_notion_token
NOTION_ORGANIZATIONS_DB_ID=your_organizations_db_id
NOTION_CONTACTS_DB_ID=your_contacts_db_id

# Circle.so API access
CIRCLE_API_TOKEN=your_circle_api_token
```

## Getting Circle.so API Token

1. **Go to Circle.so Admin → Settings → API**
2. **Click "Create Token"**
3. **Choose "Headless Auth" token type**
4. **Copy the token** and add to Vercel environment variables

## Authentication Flow

### User Journey
1. **User visits CSC tool** (e.g., manage.my.campusstores.ca)
2. **Clicks "Continue with Circle.so"**
3. **Enters their Circle.so email address**
4. **System verifies:**
   - Email exists in Circle.so community
   - User is active member
   - Email matches Notion contact database
5. **User gets session token** with both Circle and CSC identity
6. **Access granted** to all CSC tools

### Technical Flow
```
User Email → Circle.so API → Verify Membership → Notion Lookup → CSC Session
```

## API Endpoints

### `/api/verify-circle-user`
- **Purpose**: Verify Circle.so membership and map to CSC identity
- **Method**: POST
- **Input**: `{ email: "user@example.com" }`
- **Output**: Session token with Circle + CSC identity

## Session Token Contents

The generated session contains both identities:

```json
{
  "circle": {
    "user_id": "circle_user_id",
    "email": "user@example.com",
    "name": "User Name",
    "avatar_url": "https://...",
    "access_token": "circle_api_token"
  },
  "csc": {
    "contact_id": "notion_contact_id",
    "contact_name": "Contact Name",
    "work_email": "work@institution.ca",
    "organization_id": "notion_org_id",
    "organization_name": "Institution Name",
    "role": "primary|member"
  },
  "issued": 1234567890,
  "expires": 1234567890
}
```

## Security Benefits

✅ **Leverages existing authentication** - No new passwords
✅ **Maintains Circle.so security** - Uses their proven auth system
✅ **No disruption to Circle users** - No changes to existing workflow
✅ **API-based verification** - Secure server-side validation
✅ **Time-limited sessions** - 24-hour token expiry

## Integration with Other CSC Tools

Any CSC tool can verify the session token to get:
- Circle.so identity and avatar
- CSC organization and role
- Work email and contact info
- Permission level (primary vs member)

Example verification:
```javascript
// In any CSC tool
const sessionToken = req.headers.authorization;
const session = JSON.parse(Buffer.from(sessionToken, 'base64').toString());
const userRole = session.csc.role; // 'primary' or 'member'
const organization = session.csc.organization_name;
```

## Advantages Over OAuth Provider Approach

1. **No disruption** to existing Circle.so users
2. **Safer during high traffic** - doesn't change Circle login
3. **Uses proven authentication** - Circle's existing security
4. **Simpler setup** - Just API integration, no OAuth complexity
5. **Better UX** - Users already trust Circle.so login

## Error Handling

- **User not in Circle.so**: Clear message to join community first
- **Email mismatch**: Prompt to use correct Circle.so email
- **Not in CSC database**: Contact steve@campusstores.ca for linking
- **API failures**: Graceful fallback with support contact

## Future Enhancements

- Automatic sync between Circle.so profiles and Notion contacts
- Role mapping from Circle.so groups to CSC permissions
- Real-time membership status updates
- Integration with Circle.so notifications and events

This approach provides secure, reliable access to CSC tools while respecting existing Circle.so authentication and user workflows.