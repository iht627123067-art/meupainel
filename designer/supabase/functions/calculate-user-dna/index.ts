// Supabase Edge Function: calculate-user-dna
// Recalculates user content DNA based on interaction history

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CategoryCount {
    [category: string]: number;
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("🧬 Starting DNA calculation...");

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { user_id } = await req.json();

        if (!user_id) {
            throw new Error("Missing user_id");
        }

        console.log(`📊 Calculating DNA for user: ${user_id}`);

        // 1. Get all user interactions
        const { data: interactions, error: interactionsError } = await supabase
            .from("user_article_interactions")
            .select("*")
            .eq("user_id", user_id);

        if (interactionsError) throw interactionsError;

        console.log(`Found ${interactions?.length || 0} interactions`);

        // 2. Calculate category distributions
        const publishedCategories: CategoryCount = {};
        const archivedCategories: CategoryCount = {};
        let totalPublished = 0;
        let totalArchived = 0;
        let totalPodcasts = 0;

        for (const interaction of interactions || []) {
            const category = interaction.article_category || "Uncategorized";

            if (interaction.interaction_type === "published_linkedin") {
                publishedCategories[category] = (publishedCategories[category] || 0) + 1;
                totalPublished++;
            } else if (interaction.interaction_type === "archived") {
                archivedCategories[category] = (archivedCategories[category] || 0) + 1;
                totalArchived++;
            } else if (interaction.interaction_type === "included_in_podcast") {
                totalPodcasts++;
            }
        }

        // 3. Calculate preferred categories (top 5 published)
        const preferredCategories = Object.entries(publishedCategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([category]) => category);

        // 4. Calculate DNA score (0 to 1)
        // Based on: total interactions, diversity of categories, engagement ratio
        const totalInteractions = (interactions?.length || 0);
        const uniqueCategories = new Set([
            ...Object.keys(publishedCategories),
            ...Object.keys(archivedCategories)
        ]).size;

        let dnaScore = 0.5; // Base score

        if (totalInteractions > 0) {
            // Interaction volume bonus (max +0.2)
            dnaScore += Math.min(0.2, totalInteractions / 100);

            // Category diversity bonus (max +0.15)
            dnaScore += Math.min(0.15, uniqueCategories / 10);

            // Engagement ratio bonus (max +0.15)
            const engagementRatio = totalPublished / (totalPublished + totalArchived + 1);
            dnaScore += engagementRatio * 0.15;
        }

        dnaScore = Math.min(1.0, Math.max(0.0, dnaScore));

        console.log(`📈 DNA Score: ${dnaScore.toFixed(2)}`);
        console.log(`📚 Preferred Categories: ${preferredCategories.join(", ")}`);

        // 5. Upsert DNA record
        const { error: upsertError } = await supabase
            .from("user_content_dna")
            .upsert({
                user_id,
                preferred_categories: preferredCategories,
                published_categories: publishedCategories,
                archived_categories: archivedCategories,
                total_published: totalPublished,
                total_archived: totalArchived,
                total_podcasts_generated: totalPodcasts,
                dna_score: dnaScore,
                last_updated_at: new Date().toISOString(),
            }, {
                onConflict: "user_id"
            });

        if (upsertError) throw upsertError;

        console.log("✅ DNA updated successfully");

        return new Response(
            JSON.stringify({
                success: true,
                dna: {
                    score: dnaScore,
                    preferred_categories: preferredCategories,
                    total_published: totalPublished,
                    total_archived: totalArchived,
                    total_podcasts: totalPodcasts,
                },
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("🔥 Error calculating DNA:", message);

        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
