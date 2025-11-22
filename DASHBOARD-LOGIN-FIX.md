# Dashboard Login Infinite Reload Fix

## Problem Summary

After logging in at `/dashboardlogin.html`, the application was experiencing an infinite reload loop instead of properly loading the dashboard with retrieved account information from Supabase.

## Root Cause Analysis

### Issue 1: Unnecessary Redirect in Dashboard
**Location**: `dashboard.html` lines 684-687

The dashboard was redirecting to itself when the URL parameter `id` was missing, even though it already had the account ID from the cookie. This created a potential loop:

```javascript
// OLD CODE - PROBLEMATIC
if (!idFromUrl && accountId) {
    console.log('🔄 No ID in URL, redirecting to dashboard with cookie ID');
    window.location.replace(`/dashboard.html?id=${encodeURIComponent(accountId)}`);
    return; // Stop execution
}
```

**Problem**: This redirect could trigger repeatedly if:
- The page reloaded without preserving the URL parameter
- Browser navigation caused parameter loss
- Timing issues with cookie availability

### Issue 2: No Loop Protection
Neither page had protection against redirect loops. If something went wrong during the authentication flow, the pages would bounce between each other indefinitely.

### Issue 3: Auto-redirect Without Context Check
**Location**: `dashboardlogin.html` lines 112-135

The login page would automatically redirect to dashboard if it found a cookie, but it didn't check if the user was intentionally coming from a failed dashboard load (which would require re-authentication).

## Solutions Implemented

### 1. Replace Hard Redirect with URL State Update
**File**: `dashboard.html`

Instead of redirecting when the ID is missing from the URL, we now:
- Use `window.history.replaceState()` to update the URL without reloading
- Continue loading the dashboard with the cookie ID directly
- Avoid unnecessary page reloads

```javascript
// NEW CODE - FIXED
if (!idFromUrl && accountId) {
    console.log('ℹ️ No ID in URL, using ID from cookie:', accountId);
    // Don't redirect - just use the accountId from cookie
    // Update URL without reload using replaceState
    const newUrl = `/dashboard.html?id=${encodeURIComponent(accountId)}`;
    window.history.replaceState(null, '', newUrl);
}
```

### 2. Add Redirect Loop Protection
**File**: `dashboard.html`

Implemented sessionStorage-based loop detection:
- Set a flag when starting a redirect
- Check for this flag on page load
- If detected, clear session and redirect to login (breaking the loop)

```javascript
// Check if we're already in a redirect loop
if (window.sessionStorage.getItem('dashboard_redirect_in_progress') === 'true') {
    console.error('❌ Redirect loop detected, clearing session and redirecting to login');
    window.sessionStorage.removeItem('dashboard_redirect_in_progress');
    document.cookie = 'dashboard_sesh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    window.location.replace('/dashboardlogin.html');
    return;
}
```

### 3. Set Redirect Flag Before Navigation
**File**: `dashboardlogin.html`

Before redirecting to dashboard after successful login:

```javascript
// Set redirect protection flag
window.sessionStorage.setItem('dashboard_redirect_in_progress', 'true');

// Then redirect
window.location.replace(redirectUrl);
```

The dashboard clears this flag once it successfully loads, proving the redirect succeeded.

### 4. Check Referrer Before Auto-redirect
**File**: `dashboardlogin.html`

Added check to prevent auto-redirect loop:

```javascript
// Check if we're coming from a failed dashboard load (to prevent loop)
const fromDashboard = document.referrer.includes('/dashboard.html');
if (fromDashboard) {
    console.log('ℹ️ Coming from dashboard, allowing re-login');
    return;
}
```

This allows users who are redirected from dashboard due to authentication issues to properly re-login.

## Authentication Flow (Fixed)

### Successful Login Flow
1. User enters email at `/dashboardlogin.html`
2. System queries Supabase for account with matching email (case-insensitive)
3. If found:
   - Create `dashboard_sesh` cookie with account ID and email
   - Verify cookie was set correctly
   - Set redirect protection flag in sessionStorage
   - Redirect to `/dashboard.html?id=<account_id>`
4. Dashboard page loads:
   - Clear redirect protection flag (proves redirect succeeded)
   - Wait up to 2 seconds for cookie to be available
   - Verify cookie ID matches URL ID
   - Fetch account data from Supabase
   - Display dashboard with retrieved information

### Failed Login Flow
1. User enters email at `/dashboardlogin.html`
2. System queries Supabase
3. If not found:
   - Show error message "Aucun compte trouvé avec cet email"
   - Allow user to retry
   - Form remains active

### Cookie Validation Flow
- Dashboard checks for `dashboard_sesh` cookie
- If missing after 2 seconds: redirect to login
- If ID mismatch between cookie and URL: redirect to login
- If cookie exists but URL missing ID: use `replaceState` to update URL (no reload)

## Cookie Structure

```javascript
{
    id: "account-uuid",
    email: "user@example.com",
    loginTime: "2025-11-21T12:00:00.000Z"
}
```

Cookie properties:
- Name: `dashboard_sesh`
- Expiration: 30 days
- Path: `/`
- SameSite: `Lax`

## Testing Recommendations

1. **Normal Login**: Enter valid email, verify dashboard loads with correct data
2. **Invalid Email**: Enter non-existent email, verify error message shows
3. **Cookie Persistence**: Close and reopen browser, verify still logged in
4. **Direct Dashboard Access**: Try accessing `/dashboard.html` without cookie, verify redirect to login
5. **Cookie Tampering**: Modify cookie ID, verify redirect to login
6. **Back Button**: After login, press back button, verify no loop occurs
7. **Refresh**: Refresh dashboard multiple times, verify no reload loops

## Database Query

The login uses case-insensitive email matching:

```javascript
const { data, error } = await supabaseClient
    .from('accounts')
    .select('id, email')
    .ilike('email', normalizedEmail)  // Case-insensitive match
    .maybeSingle();
```

This ensures emails like "Test@Email.com" match "test@email.com" in the database.

## Security Considerations

1. **No passwords**: System uses email-only authentication (passwordless)
2. **Cookie expiration**: 30-day expiration prevents indefinite sessions
3. **Service role key**: Uses Supabase service role for database access (should be moved to environment variable in production)
4. **HTTPS recommended**: Ensure site is served over HTTPS in production for cookie security

## Future Improvements

1. Move Supabase credentials to environment variables
2. Add email verification/magic link for stronger authentication
3. Implement session refresh mechanism
4. Add audit logging for login attempts
5. Consider adding rate limiting for login attempts
6. Implement "Remember Me" option with different expiration times
7. Add multi-device session management

## Files Modified

- `/dashboardlogin.html` - Login page with authentication logic
- `/dashboard.html` - Main dashboard page with session validation

## Breaking Changes

None. The fix maintains backward compatibility with existing sessions.

