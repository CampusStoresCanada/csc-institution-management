# Circle.so OAuth Integration Setup

This document explains how to configure Circle.so to use CSC's authentication system as an OAuth provider.

## Environment Variables Required

Add these to your Vercel project:

```
# Existing Notion variables
NOTION_TOKEN=your_notion_token
NOTION_ORGANIZATIONS_DB_ID=your_organizations_db_id
NOTION_CONTACTS_DB_ID=your_contacts_db_id

# New Circle.so OAuth variables
CIRCLE_CLIENT_ID=your_circle_client_id
CIRCLE_CLIENT_SECRET=your_circle_client_secret
```

## Circle.so Configuration

1. **Go to Circle.so Admin → Settings → SSO**

2. **Configure OAuth Endpoints:**
   - **Authorization URL**: `https://manage.my.campusstores.ca/api/circle-auth/authorize`
   - **Token Fetch URL**: `https://manage.my.campusstores.ca/api/circle-auth/token`
   - **Profile Info API URL**: `https://manage.my.campusstores.ca/api/circle-auth/profile`

3. **Set Client Credentials:**
   - Generate a secure `client_id` and `client_secret`
   - Add them to both Circle.so config and Vercel env vars

4. **Test the Integration:**
   - Users will see "Login with CSC" option in Circle.so
   - They enter their work email (from Notion contacts)
   - System verifies against Notion and creates Circle.so session

## How It Works

### Authentication Flow

1. **User clicks "Login with CSC" in Circle.so**
2. **Circle.so redirects to** `/api/circle-auth/authorize`
3. **System redirects to** `/circle-login` with OAuth state
4. **User enters work email**
5. **System verifies email** against Notion contacts database
6. **System redirects back to Circle.so** with auth code
7. **Circle.so exchanges code for token** via `/api/circle-auth/token`
8. **Circle.so fetches user profile** via `/api/circle-auth/profile`
9. **User is logged into Circle.so** with CSC identity

### User Data Flow

- **Email**: Work email from Notion contacts (`Work Email` field)
- **Name**: Contact name from Notion (`Name` field)
- **Organization**: Linked organization name
- **Role**: `primary` if Primary Contact checkbox is checked, otherwise `member`

## Benefits

✅ **Single Sign-On**: Users authenticate once for all CSC tools
✅ **Notion as Source of Truth**: All user data comes from existing Notion databases
✅ **No New Passwords**: Users just enter their work email
✅ **Universal Sessions**: Same authentication works across CSC tools
✅ **Role-Based Access**: Primary contacts vs regular members

## Security Features

- OAuth state validation with 5-minute expiry
- Client credential verification
- JWT-style token format
- Access token expiration (1 hour)
- Email-based user verification against Notion

## Future Integration

This OAuth system can be extended to:
- Authenticate users for membership renewal tool
- Provide access to institution management
- Support conference registration systems
- Enable access to future CSC website features

All CSC tools can verify Circle.so authentication tokens and inherit the user's identity and permissions.