
import { createClient } from "npm:@supabase/supabase-js";
import { config } from "https://deno.land/x/dotenv/mod.ts";

// Load environment variables
const env = config({ path: "../../.env" });
const supabaseUrl = env["VITE_SUPABASE_URL"] || Deno.env.get("VITE_SUPABASE_URL");
const supabaseKey = env["VITE_SUPABASE_ANON_KEY"] || Deno.env.get("VITE_SUPABASE_ANON_KEY");
const serviceKey = env["SUPABASE_SERVICE_ROLE_KEY"] || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
    console.error("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env");
    Deno.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function repairClustering() {
    console.log("Starting Clustering Repair...");

    // 1. Fetch alerts from the last 7 days (or more if needed)
    const { data: alerts, error } = await supabase
        .from("alerts")
        .select("id, title, description, url, created_at, email_date")
        .gt("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching alerts:", error);
        return;
    }

    console.log(`Found ${alerts.length} alerts to process.`);
    let processed = 0;
    let clustered = 0;

    // 2. Process in chunks to avoid overwhelming the DB (though now optimized)
    for (const alert of alerts) {
        processed++;
        if (processed % 50 === 0) console.log(`Processed ${processed}/${alerts.length}...`);

        try {
            const publishDate = alert.email_date || alert.created_at;

            // Call the RPC
            const { data: groupId, error: rpcError } = await supabase.rpc('assign_or_create_group_v2', {
                p_alert_id: alert.id,
                p_title: alert.title,
                p_description: alert.description || "",
                p_url: alert.url,
                p_created_at: publishDate
            });

            if (rpcError) {
                console.error(`RPC Error for ${alert.id}:`, rpcError.message);
            } else if (groupId) {
                clustered++;
            }

        } catch (e) {
            console.error(`Exception processing ${alert.id}:`, e);
        }
    }

    console.log("Repair Complete!");
    console.log(`Total Processed: ${processed}`);
    console.log(`Items assigned to clusters: ${clustered}`);
}

repairClustering();
