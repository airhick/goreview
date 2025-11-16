// Database Proxy - All operations go directly to Supabase
// Simple wrapper around Supabase client
// Version: 2.0 - Direct Supabase (no webhook)
console.log('✅ db-proxy.js v2.0 loaded - Using Supabase directly (no webhook)');

const SUPABASE_URL = 'https://vigutqmfosxbpncussie.supabase.co';
const SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpZ3V0cW1mb3N4YnBuY3Vzc2llIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTU4NDc1MiwiZXhwIjoyMDc3MTYwNzUyfQ.WPhspJ5LQ7E6k9sUFJsaISU6eVcJnIPGYv0GPGQfd98';

// Initialize Supabase client
let supabaseClient = null;
let supabaseInitPromise = null;

async function getSupabaseClient() {
    if (supabaseClient) {
        return supabaseClient;
    }
    
    // If already initializing, wait for it
    if (supabaseInitPromise) {
        await supabaseInitPromise;
        return supabaseClient;
    }
    
    // Start initialization
    supabaseInitPromise = (async () => {
        // Wait for Supabase library to load
        let retries = 0;
        while (typeof supabase === 'undefined' && retries < 30) {
            await new Promise(resolve => setTimeout(resolve, 100));
            retries++;
        }
        
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase library not loaded after 3 seconds');
        }
        
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
        return supabaseClient;
    })();
    
    await supabaseInitPromise;
    return supabaseClient;
}

// Helper functions for common operations

/**
 * SELECT query - Uses Supabase directly
 * Returns Supabase format { data, error }
 */
async function dbSelect(table, filters = {}, options = {}) {
    try {
        const client = await getSupabaseClient();
        
        // Build Supabase query
        let query = client.from(table).select(options.select ? options.select.join(',') : '*');
        
        // Apply filters
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        // Apply limit
        if (options.limit) {
            query = query.limit(options.limit);
        }
        
        // Apply single/maybeSingle
        if (options.single) {
            query = query.maybeSingle();
        }
        
        const result = await query;
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * INSERT query - Uses Supabase directly
 * Returns Supabase format { data, error }
 */
async function dbInsert(table, data, options = {}) {
    try {
        const client = await getSupabaseClient();
        const result = await client.from(table).insert(data);
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * UPDATE query - Uses Supabase directly
 * Returns Supabase format { data, error }
 */
async function dbUpdate(table, data, filters, options = {}) {
    try {
        const client = await getSupabaseClient();
        let query = client.from(table).update(data);
        
        // Apply filters
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        const result = await query;
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * DELETE query - Uses Supabase directly
 * Returns Supabase format { data, error }
 */
async function dbDelete(table, filters, options = {}) {
    try {
        const client = await getSupabaseClient();
        let query = client.from(table).delete();
        
        // Apply filters
        Object.keys(filters).forEach(key => {
            query = query.eq(key, filters[key]);
        });
        
        const result = await query;
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

/**
 * UPSERT query - Uses Supabase directly
 * Returns Supabase format { data, error }
 */
async function dbUpsert(table, data, options = {}) {
    try {
        const client = await getSupabaseClient();
        const result = await client.from(table).upsert(data);
        return result;
    } catch (error) {
        return { data: null, error: { message: error.message } };
    }
}

// Export functions for use in other files
if (typeof window !== 'undefined') {
    window.dbProxy = {
        select: dbSelect,
        insert: dbInsert,
        update: dbUpdate,
        delete: dbDelete,
        upsert: dbUpsert
    };
}



