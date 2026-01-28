// Supabase Edge Function: classify-content
// Classifies extracted content using Gemini AI.
// Robust implementation with fallbacks.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Helper to check if content is meaningful enough for classification
 */
function isContentSufficient(content: string): boolean {
    if (!content) return false;
    const trimmed = content.trim();
    return trimmed.length > 50;
}

/**
 * Classify with OpenAI (ChatGPT)
 */
async function classifyWithOpenAI(prompt: string, apiKey: string): Promise<any> {
    try {
        console.log(`🤖 Attempting OpenAI classification (gpt-4o-mini)`);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Você é um assistente especializado em classificação de notícias. Responda apenas com JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" }
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
                console.log(`📡 OpenAI response received`);
                return JSON.parse(text);
            }
        } else {
            const errText = await response.text();
            console.warn(`      ⚠️ OpenAI failed: ${response.status} - ${errText}`);
            throw new Error(`OpenAI error: ${response.status}`);
        }
    } catch (e: any) {
        console.warn(`      ⚠️ OpenAI throw: ${e.message}`);
        throw e;
    }
}

/**
 * Classify with OpenRouter
 */
async function classifyWithOpenRouter(prompt: string, apiKey: string): Promise<any> {
    try {
        console.log(`🤖 Attempting OpenRouter classification (google/gemini-2.0-flash-exp:free)`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://supabase.com", // Required by some OpenRouter models
                "X-Title": "Meupainel"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    { role: "system", content: "Você é um assistente especializado em classificação de notícias. Responda apenas com JSON no formato solicitado." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.3,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
                console.log(`📡 OpenRouter response received`);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) return JSON.parse(jsonMatch[0]);
                return JSON.parse(text);
            }
        } else {
            const errText = await response.text();
            console.warn(`      ⚠️ OpenRouter failed: ${response.status} - ${errText}`);
            throw new Error(`OpenRouter error: ${response.status}`);
        }
    } catch (e: any) {
        console.warn(`      ⚠️ OpenRouter throw: ${e.message}`);
        throw e;
    }
}

/**
 * Classify with Gemini 1.5 Flash
 */
async function classifyWithGemini(prompt: string, apiKey: string): Promise<any> {
    // Try multiple model variations
    const models = ["gemini-2.0-flash-exp", "gemini-1.5-flash", "gemini-pro"];
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`🤖 Attempting Gemini with model: ${model}`);
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 500,
                    }
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`📡 Gemini response received for model ${model}`);

                const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (text) {
                    console.log(`📝 Raw AI output: ${text.substring(0, 100)}...`);
                    const jsonMatch = text.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const parsed = JSON.parse(jsonMatch[0]);
                            if (parsed && typeof parsed === 'object') {
                                return parsed;
                            }
                        } catch (e: any) {
                            console.warn(`      ⚠️ Failed to parse JSON match: ${e.message}`);
                        }
                    } else {
                        // Try parsing raw text if no JSON block found
                        try {
                            const parsed = JSON.parse(text);
                            if (parsed && typeof parsed === 'object') {
                                return parsed;
                            }
                        } catch (e: any) {
                            console.warn(`      ⚠️ Failed to parse raw text as JSON: ${e.message}`);
                        }
                    }
                } else {
                    console.warn(`      ⚠️ Empty response from Gemini ${model}`);
                }
            } else {
                const errText = await response.text();
                console.warn(`      ⚠️ Gemini ${model} failed: ${response.status} - ${errText}`);
                lastError = new Error(`Gemini ${model} error: ${response.status}`);
            }
        } catch (e: any) {
            console.warn(`      ⚠️ Gemini ${model} throw: ${e.message}`);
            lastError = e;
        }
    }
    throw lastError || new Error("All Gemini models failed to provide a valid classification");
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiKey = Deno.env.get("GEMINI_API_KEY");
        const openAIKey = Deno.env.get("OPENAI_API_KEY");
        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { alert_id } = body;

        if (!alert_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: alert_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`\n🚀 ========== STARTING CLASSIFICATION ==========`);
        console.log(`📋 Alert ID: ${alert_id}`);

        // 1. Get the extracted content and the original alert
        const { data: extracted } = await supabase
            .from("extracted_content")
            .select("cleaned_content, markdown_content, extraction_status, error_message")
            .eq("alert_id", alert_id)
            .single();

        if (extracted?.extraction_status === 'failed') {
            console.log(`⚠️ Extraction previously failed for this alert: ${extracted.error_message}. Skipping classification.`);
            return new Response(
                JSON.stringify({
                    success: false,
                    error: "Extraction failed",
                    details: extracted.error_message
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const { data: alert, error: alertError } = await supabase
            .from("alerts")
            .select("title, description")
            .eq("id", alert_id)
            .single();

        if (alertError || !alert) {
            throw new Error(`Alert not found: ${alertError?.message}`);
        }

        const content = extracted?.cleaned_content || extracted?.markdown_content || alert.description || "";

        if (!isContentSufficient(content)) {
            console.log(`⚠️ Content insufficient. Skipping AI call.`);
            const fallbackResult = {
                destination: "archive",
                confidence_score: 0.1,
                reasoning: content.length === 0 ? "Conteúdo vazio" : "Conteúdo insuficiente",
            };

            await supabase
                .from("ai_classifications")
                .upsert({ alert_id, ...fallbackResult, created_at: new Date().toISOString() }, { onConflict: 'alert_id' });

            return new Response(
                JSON.stringify({ success: false, ...fallbackResult, error: "Content insufficient" }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // 2. Classify
        const prompt = `
        Classifique o seguinte artigo de notícias baseado no conteúdo e decida se ele deve ir para o LinkedIn ou ser arquivado.
        Categorias possíveis:
        - "linkedin": Conteúdo de alta qualidade, relevante para IA, postagens técnicas, insights de mercado ou tutoriais úteis.
        - "archive": Notícias genéricas, Clickbaits, Conteúdo irrelevante, repetitivo ou de baixa qualidade.

        Responda APENAS em formato JSON:
        {
            "destination": "linkedin" | "archive",
            "confidence_score": 0.0 a 1.0,
            "reasoning": "Breve explicação em português"
        }

        Título: ${alert.title}
        Conteúdo: ${content.substring(0, 10000)}
        `;

        let result = null;
        let usedProvider = "";

        // Prioridade: OpenRouter se disponível
        if (openRouterKey) {
            try {
                result = await classifyWithOpenRouter(prompt, openRouterKey);
                usedProvider = "openrouter";
            } catch (err) {
                console.error("OpenRouter classification failed, trying fallbacks:", err);
            }
        }

        // Fallback: OpenAI
        if (!result && openAIKey) {
            try {
                result = await classifyWithOpenAI(prompt, openAIKey);
                usedProvider = "openai";
            } catch (err) {
                console.error("OpenAI classification failed, trying Gemini fallback:", err);
            }
        }

        // Fallback: Gemini
        if (!result && geminiKey) {
            result = await classifyWithGemini(prompt, geminiKey);
            usedProvider = "gemini";
        }

        if (!result || typeof result !== 'object') {
            throw new Error("No AI provider (OpenRouter/OpenAI/Gemini) was able to provide a valid classification");
        }

        const destination = result.destination || "archive";
        const confidence_score = result.confidence_score ?? 0.0;
        const reasoning = result.reasoning || "Sem explicação provida pela IA";

        console.log(`✅ AI Classification (${usedProvider}): ${destination} (Score: ${confidence_score})`);

        // 3. Save classification
        const { error: upsertError } = await supabase
            .from("ai_classifications")
            .upsert({
                alert_id,
                destination,
                confidence_score,
                reasoning,
                created_at: new Date().toISOString()
            }, { onConflict: 'alert_id' });

        if (upsertError) throw upsertError;

        // 4. Update Alert status
        await supabase
            .from("alerts")
            .update({ status: "classified" })
            .eq("id", alert_id);

        console.log(`\n✅ ========== CLASSIFICATION COMPLETE ==========\n`);

        // 5. AUTO-GENERATION FAST TRACK
        // If high confidence and LinkedIn destination, trigger post generation in background
        if (destination === "linkedin" && confidence_score > 0.8) {
            console.log(`🚀 [FAST TRACK] High confidence detected (${confidence_score}). Triggering auto-post generation...`);

            // Get user_id for the alert to pass to the generator
            const { data: alertData } = await supabase
                .from("alerts")
                .select("user_id")
                .eq("id", alert_id)
                .single();

            if (alertData?.user_id) {
                // Trigger background generation (non-blocking)
                supabase.functions.invoke("generate-linkedin-post", {
                    body: {
                        alert_id,
                        user_id: alertData.user_id,
                        is_auto: true // Signal it was auto-triggered
                    }
                }).then(({ error }) => {
                    if (error) console.error("❌ Auto-generation failed:", error.message);
                    else console.log("✅ Auto-generation started successfully");
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                destination,
                confidence_score,
                reasoning,
                provider: usedProvider
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Classification error (caught):", message);

        // FAIL-SAFE: Return 200 OK with "needs_review" instead of 500
        return new Response(
            JSON.stringify({
                success: true, // It "succeeded" in being processed, even if AI failed
                destination: "needs_review",
                confidence_score: 0,
                reasoning: `Falha na Classificação Automática: ${message}. Encaminhado para revisão manual.`,
                provider: "fallback_handler"
            }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            }
        );
    }
});
