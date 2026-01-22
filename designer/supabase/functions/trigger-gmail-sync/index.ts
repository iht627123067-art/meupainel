// Supabase Edge Function: trigger-gmail-sync
// Called by pg_cron to trigger daily Gmail synchronization

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log("Starting scheduled Gmail sync...");

        // Get all connected accounts
        const { data: accounts, error: accountsError } = await supabase
            .from("email_accounts")
            .select("id, email, user_id")
            .eq("oauth_connected", true)
            .eq("sync_enabled", true);

        if (accountsError) throw accountsError;

        if (!accounts || accounts.length === 0) {
            console.log("No connected accounts to sync");
            return new Response(
                JSON.stringify({ success: true, message: "No accounts to sync" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Found ${accounts.length} accounts to sync`);

        // Call sync-gmail for all accounts
        const syncResponse = await fetch(
            `${supabaseUrl}/functions/v1/sync-gmail`,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${supabaseKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({}), // Empty = sync all connected accounts
            }
        );

        if (!syncResponse.ok) {
            const error = await syncResponse.text();
            throw new Error(`Sync failed: ${error}`);
        }

        const result = await syncResponse.json();

        console.log("Scheduled sync completed:", result);

        return new Response(
            JSON.stringify({
                success: true,
                message: "Scheduled sync completed",
                ...result,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error in trigger-gmail-sync:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
