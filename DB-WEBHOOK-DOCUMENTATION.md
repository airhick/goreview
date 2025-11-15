# Database Webhook Documentation

## Overview
All database operations are routed through: `https://n8n.goreview.fr/webhook-test/modif`

## Payload Structure

Every request sent to the webhook follows this standard format:

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_abc123def",
  
  "table": "accounts",
  "operation": "SELECT|INSERT|UPDATE|DELETE|UPSERT",
  
  "data": { /* For INSERT, UPDATE, UPSERT */ },
  "filters": { /* For SELECT, UPDATE, DELETE */ },
  
  "select": ["*"] /* or ["id", "name", "email"] */,
  "limit": null /* or number */,
  "single": false /* true for maybeSingle/single */,
  
  "metadata": {
    "user_agent": "...",
    "page_url": "...",
    /* custom metadata */
  }
}
```

---

## Operation Types

### 1. SELECT
Retrieve data from a table.

**Example Request:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_abc123",
  
  "table": "accounts",
  "operation": "SELECT",
  
  "data": null,
  "filters": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  
  "select": ["*"],
  "limit": 1,
  "single": true,
  
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "page_url": "https://goreview.fr/dashboard",
    "note": "Fetching account data for dashboard"
  }
}
```

**n8n → Supabase:**
```sql
SELECT * FROM accounts WHERE id = '550e8400-e29b-41d4-a716-446655440000' LIMIT 1
```

---

### 2. INSERT
Insert new data into a table.

**Example Request:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_xyz456",
  
  "table": "accounts",
  "operation": "INSERT",
  
  "data": {
    "name": "Restaurant Example",
    "email": "contact@example.com",
    "place_id": "ChIJN1t_tDeuEmsRUsoyG83frY4"
  },
  "filters": {},
  
  "select": ["*"],
  "limit": null,
  "single": false,
  
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "page_url": "https://goreview.fr/create",
    "note": "Creating new account"
  }
}
```

**n8n → Supabase:**
```sql
INSERT INTO accounts (name, email, place_id) 
VALUES ('Restaurant Example', 'contact@example.com', 'ChIJN1t_tDeuEmsRUsoyG83frY4')
RETURNING *
```

---

### 3. UPDATE
Update existing data in a table.

**Example Request:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_update123",
  
  "table": "accounts",
  "operation": "UPDATE",
  
  "data": {
    "current_rating": 4.5,
    "tot_review": 150,
    "games": true
  },
  "filters": {
    "id": "550e8400-e29b-41d4-a716-446655440000"
  },
  
  "select": ["*"],
  "limit": null,
  "single": false,
  
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "page_url": "https://goreview.fr/dashboard",
    "note": "Updating rating and game status"
  }
}
```

**n8n → Supabase:**
```sql
UPDATE accounts 
SET current_rating = 4.5, tot_review = 150, games = true
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
RETURNING *
```

---

### 4. DELETE
Delete data from a table.

**Example Request:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_del789",
  
  "table": "contacts",
  "operation": "DELETE",
  
  "data": null,
  "filters": {
    "id": "contact-123",
    "account_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  
  "select": [],
  "limit": null,
  "single": false,
  
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "page_url": "https://goreview.fr/dashboard",
    "note": "Deleting contact"
  }
}
```

**n8n → Supabase:**
```sql
DELETE FROM contacts 
WHERE id = 'contact-123' AND account_id = '550e8400-e29b-41d4-a716-446655440000'
```

---

### 5. UPSERT
Insert or update data (insert if not exists, update if exists).

**Example Request:**
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "source": "goreview-app",
  "request_id": "req_1736938200000_upsert456",
  
  "table": "accounts",
  "operation": "UPSERT",
  
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "current_rating": 4.8,
    "tot_review": 200
  },
  "filters": {},
  
  "select": ["*"],
  "limit": null,
  "single": false,
  
  "metadata": {
    "user_agent": "Mozilla/5.0...",
    "page_url": "https://goreview.fr/dashboard",
    "note": "Upserting rating data"
  }
}
```

**n8n → Supabase:**
```sql
INSERT INTO accounts (id, current_rating, tot_review)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 4.8, 200)
ON CONFLICT (id) DO UPDATE 
SET current_rating = 4.8, tot_review = 200
RETURNING *
```

---

## n8n Routing Logic

In your n8n workflow, you can route requests based on the `operation` and `table` fields:

### Example n8n Flow:

```
1. Webhook Trigger (receives payload)
   ↓
2. Switch Node (based on {{ $json.operation }})
   ├─ SELECT → Supabase SELECT node
   ├─ INSERT → Supabase INSERT node
   ├─ UPDATE → Supabase UPDATE node
   ├─ DELETE → Supabase DELETE node
   └─ UPSERT → Supabase UPSERT node
   ↓
3. Return Response
```

### Supabase Node Configuration:

**For SELECT:**
- Table: `{{ $json.table }}`
- Filters: `{{ $json.filters }}`
- Select: `{{ $json.select }}`
- Limit: `{{ $json.limit }}`
- Return Single: `{{ $json.single }}`

**For INSERT:**
- Table: `{{ $json.table }}`
- Data: `{{ $json.data }}`

**For UPDATE:**
- Table: `{{ $json.table }}`
- Data: `{{ $json.data }}`
- Filters: `{{ $json.filters }}`

**For DELETE:**
- Table: `{{ $json.table }}`
- Filters: `{{ $json.filters }}`

**For UPSERT:**
- Table: `{{ $json.table }}`
- Data: `{{ $json.data }}`
- On Conflict: (configure based on your table)

---

## Tables in Use

Based on the codebase, these tables are accessed:

1. **accounts** - Main account/company data
   - Operations: SELECT, UPDATE
   - Common fields: id, name, email, place_id, current_rating, tot_review, games, wich_game, contact_table

2. **contacts** (or via contact_table JSON column)
   - Operations: SELECT, INSERT, UPDATE, DELETE
   - Stored as JSON in accounts.contact_table

---

## Response Format

Your n8n webhook should return this format:

```json
{
  "success": true,
  "data": { /* Supabase response */ },
  "error": null,
  "request_id": "req_1736938200000_abc123"
}
```

Or on error:

```json
{
  "success": false,
  "data": null,
  "error": "Error message here",
  "request_id": "req_1736938200000_abc123"
}
```

---

## Usage in Frontend

Include the `db-proxy.js` script in your HTML:

```html
<script src="db-proxy.js"></script>
```

Then use the helper functions:

```javascript
// SELECT
const account = await window.dbProxy.select('accounts', { id: accountId }, { single: true });

// INSERT
const newAccount = await window.dbProxy.insert('accounts', {
  name: 'New Restaurant',
  email: 'new@restaurant.com'
});

// UPDATE
await window.dbProxy.update('accounts', 
  { current_rating: 4.5, tot_review: 150 },
  { id: accountId }
);

// DELETE
await window.dbProxy.delete('contacts', { id: contactId });

// UPSERT
await window.dbProxy.upsert('accounts', {
  id: accountId,
  current_rating: 4.8
});
```

---

## Security Notes

⚠️ **Important**: This is a TEST endpoint. For production:

1. Add authentication to the webhook
2. Validate all inputs in n8n
3. Use environment variables for sensitive data
4. Add rate limiting
5. Log all operations for audit trail
6. Use HTTPS only (already done)

---

## Migration from Direct Supabase

Replace direct Supabase calls:

**Before:**
```javascript
await supabaseClient
  .from('accounts')
  .update({ current_rating: 4.5 })
  .eq('id', accountId);
```

**After:**
```javascript
await window.dbProxy.update('accounts',
  { current_rating: 4.5 },
  { id: accountId }
);
```

---

## Testing

Test the webhook with curl:

```bash
curl -X POST https://n8n.goreview.fr/webhook-test/modif \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-01-15T10:30:00.000Z",
    "source": "goreview-app",
    "request_id": "test_123",
    "table": "accounts",
    "operation": "SELECT",
    "data": null,
    "filters": {"id": "test-id"},
    "select": ["*"],
    "limit": 1,
    "single": true,
    "metadata": {}
  }'
```



