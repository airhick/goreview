// Database Proxy - Routes all database operations through n8n webhook
// This allows you to manually route requests to Supabase in n8n

const DB_WEBHOOK_URL = 'https://n8n.goreview.fr/webhook-test/modif';
const DB_WEBHOOK_USER = 'yck69';
const DB_WEBHOOK_PASS = 'yck69';

/**
 * Send a database operation through the webhook
 * @param {Object} settings - Operation settings
 * @param {string} settings.table - Table name (e.g., 'accounts', 'contacts')
 * @param {string} settings.operation - Operation type ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'UPSERT')
 * @param {Object} settings.data - Data to insert/update (for INSERT, UPDATE, UPSERT)
 * @param {Object} settings.filters - Filter conditions (e.g., {id: '123', status: 'active'})
 * @param {Array<string>} settings.select - Columns to select (for SELECT) - defaults to ['*']
 * @param {number} settings.limit - Limit number of results (optional)
 * @param {boolean} settings.single - Return single result (maybeSingle/single)
 * @param {Object} settings.metadata - Additional metadata for logging/routing
 * @returns {Promise<Object>} Response from n8n webhook
 */
async function sendDatabaseRequest(settings) {
    const payload = {
        // Standard settings for n8n routing
        timestamp: new Date().toISOString(),
        source: 'goreview-app',
        request_id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        
        // Database operation settings
        table: settings.table,
        operation: settings.operation.toUpperCase(),
        
        // Data and filters
        data: settings.data || null,
        filters: settings.filters || {},
        
        // Query options
        select: settings.select || ['*'],
        limit: settings.limit || null,
        single: settings.single || false,
        
        // Metadata
        metadata: {
            user_agent: navigator.userAgent,
            page_url: window.location.href,
            ...settings.metadata
        }
    };

    console.log('📤 Sending database request:', payload);

    try {
        // Create Basic Auth header
        const authString = btoa(`${DB_WEBHOOK_USER}:${DB_WEBHOOK_PASS}`);
        
        const response = await fetch(DB_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Webhook error: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ Database request successful:', result);
        
        // Return in Supabase format { data, error }
        // n8n should return the Supabase response, which we'll wrap
        if (result.error) {
            return { data: null, error: result.error };
        }
        // If result has data property, use it; otherwise wrap the whole result
        return { data: result.data !== undefined ? result.data : result, error: null };
    } catch (error) {
        console.error('❌ Database request failed:', error);
        throw error;
    }
}

// Helper functions for common operations

/**
 * SELECT query - Returns Supabase format { data, error }
 */
async function dbSelect(table, filters = {}, options = {}) {
    try {
        const result = await sendDatabaseRequest({
            table,
            operation: 'SELECT',
            filters,
            select: options.select || ['*'],
            limit: options.limit,
            single: options.single || false,
            metadata: options.metadata
        });
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * INSERT query - Returns Supabase format { data, error }
 */
async function dbInsert(table, data, options = {}) {
    try {
        const result = await sendDatabaseRequest({
            table,
            operation: 'INSERT',
            data,
            metadata: options.metadata
        });
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * UPDATE query - Returns Supabase format { data, error }
 */
async function dbUpdate(table, data, filters, options = {}) {
    try {
        const result = await sendDatabaseRequest({
            table,
            operation: 'UPDATE',
            data,
            filters,
            metadata: options.metadata
        });
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * DELETE query
 */
async function dbDelete(table, filters, options = {}) {
    return sendDatabaseRequest({
        table,
        operation: 'DELETE',
        filters,
        metadata: options.metadata
    });
}

/**
 * UPSERT query - Returns Supabase format { data, error }
 */
async function dbUpsert(table, data, options = {}) {
    try {
        const result = await sendDatabaseRequest({
            table,
            operation: 'UPSERT',
            data,
            metadata: options.metadata
        });
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
    window.dbProxy = {
        sendDatabaseRequest,
        select: dbSelect,
        insert: dbInsert,
        update: dbUpdate,
        delete: dbDelete,
        upsert: dbUpsert
    };
}



