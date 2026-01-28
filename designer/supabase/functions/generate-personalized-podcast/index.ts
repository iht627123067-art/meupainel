// Supabase Edge Function: generate-personalized-podcast
// Generates a personalized podcast script using Content DNA and Reinforcement Learning context.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function callOpenRouter(system: string, user: string, key: string) {
    console.log("🤖 Calling OpenRouter AI...");
    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${key}`,
                "HTTP-Referer": "https://supabase.com",
                "X-Title": "Meupainel Podcast"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: user }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`AI API Error: ${response.status} - ${errText}`);
            // Log full error for debugging
            console.log("Full OpenRouter Error Response:", errText);
            throw new Error(`OpenRouter error: ${response.status} - ${errText}`);
        }
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        console.log("🤖 AI Response received (length):", text?.length);

        if (!text) {
            console.error("AI returned empty content");
            throw new Error("AI returned empty content");
        }

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("AI Response not valid JSON. First 200 chars:", text.substring(0, 200));
            throw new Error("AI did not return valid JSON");
        }
        return JSON.parse(jsonMatch[0]);
    } catch (e: any) {
        console.error("CallOpenRouter Failed:", e.message);
        throw e;
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        console.log("🚀 Function started: generate-personalized-podcast");
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
        const supabase = createClient(supabaseUrl, supabaseKey);

        const { user_id, date = new Date().toISOString().split('T')[0], mode = 'deep', specific_alert_ids } = await req.json();
        if (!user_id) throw new Error("Missing user_id");

        console.log(`🎙️ Params: User=${user_id}, Date=${date}, Mode=${mode}, SpecificIDs=${specific_alert_ids?.length || 0}`);

        // 1. Fetch User DNA
        console.log("🧬 Fetching User DNA...");
        const { data: dna, error: dnaError } = await supabase
            .from("user_content_dna")
            .select("*")
            .eq("user_id", user_id)
            .single();

        if (dnaError && dnaError.code !== 'PGRST116') {
            console.error("Error fetching DNA:", dnaError);
        }

        let articles: any[] = [];

        // 2. Fetch Articles based on Mode or Specific IDs
        if (specific_alert_ids && Array.isArray(specific_alert_ids) && specific_alert_ids.length > 0) {
            console.log(`🎯 [SPECIFIC IDS] Fetching ${specific_alert_ids.length} specific alerts...`);

            // Security: Validate IDs belong to this user
            const { data: specificAlerts, error: specificError } = await supabase
                .from("alerts")
                .select("id, title, description, publisher, created_at, status, source_type")
                .in("id", specific_alert_ids.slice(0, 25)) // Limit to 25
                .eq("user_id", user_id);

            if (specificError) {
                console.error("Error fetching specific alerts:", specificError);
                throw specificError;
            }

            // Fetch extracted content for these alerts
            const alertIds = specificAlerts?.map(a => a.id) || [];
            let contentMap = new Map();

            if (alertIds.length > 0) {
                const { data: likelyContent } = await supabase
                    .from("extracted_content")
                    .select("alert_id, markdown_content")
                    .in("alert_id", alertIds);

                if (likelyContent) {
                    contentMap = new Map(likelyContent.map(c => [c.alert_id, c.markdown_content]));
                }
            }

            console.log(`🎯 Specific alerts found: ${specificAlerts?.length || 0}`);

            articles = (specificAlerts || [])
                .filter((a: any) => (a.title && a.title.length > 5) || (a.description && a.description.length > 10))
                .map((a: any) => {
                    const fullText = contentMap.get(a.id);
                    let finalContent = fullText || a.description || "";

                    return {
                        alert_id: a.id,
                        title: a.title || "Sem título",
                        publisher: a.publisher || "Fonte Desconhecida",
                        content: finalContent.substring(0, 5000),
                        is_full_text: !!fullText,
                        source_type: a.source_type,
                        created_at: a.created_at
                    };
                });

        } else if (mode === 'quick' || mode === 'chatgpt-quick') {
            console.log(`⚡ [${mode.toUpperCase()}] Fetching raw alerts (Gmail & RSS)...`);

            // Prioritize items that are NOT rejected/published, from the last 7 days (reduced from 30 for relevance).
            const { data: rawAlerts, error: rawError } = await supabase
                .from("alerts")
                .select("id, title, description, publisher, created_at, status, source_type")
                .gte("created_at", new Date(Date.now() - 86400000 * 7).toISOString())
                .neq("status", "rejected")
                .neq("status", "published")
                .eq("user_id", user_id)
                .order("created_at", { ascending: false })
                .limit(100);

            if (rawError) throw rawError;

            // Fetch extracted content for these alerts to get full text
            const alertIds = rawAlerts?.map(a => a.id) || [];
            let contentMap = new Map();

            if (alertIds.length > 0) {
                const { data: likelyContent } = await supabase
                    .from("extracted_content")
                    .select("alert_id, markdown_content")
                    .in("alert_id", alertIds);

                if (likelyContent) {
                    contentMap = new Map(likelyContent.map(c => [c.alert_id, c.markdown_content]));
                }
            }

            console.log(`⚡ Raw alerts found: ${rawAlerts?.length || 0}`);

            // Validate and Map with Full Content Priority
            articles = (rawAlerts || [])
                .filter((a: any) => (a.title && a.title.length > 5) || (a.description && a.description.length > 10))
                .map((a: any) => {
                    const fullText = contentMap.get(a.id);
                    let finalContent = fullText || a.description || "";

                    return {
                        alert_id: a.id,
                        title: a.title || "Sem título",
                        publisher: a.publisher || "Fonte Desconhecida",
                        content: finalContent.substring(0, 5000),
                        is_full_text: !!fullText,
                        source_type: a.source_type,
                        created_at: a.created_at
                    };
                });

        } else {
            console.log(`🧠 [${mode.toUpperCase()}] Fetching processed articles...`);
            // Use the updated function signature with lookback
            const { data: deepArticles, error: artError } = await supabase.rpc('get_personalized_articles_for_podcast', {
                p_user_id: user_id,
                p_date: date,
                p_min_articles: 1,
                p_max_articles: 10,
                p_lookback_days: 7 // Look back 7 days for relevant content
            });

            if (artError) {
                console.error("Error fetching deep articles:", artError);
                // If the new signature (with p_lookback_days) failed, try the old one as fallback
                console.log("⚠️ Retrying with legacy signature...");
                const { data: legacyArticles, error: legacyError } = await supabase.rpc('get_personalized_articles_for_podcast', {
                    p_user_id: user_id,
                    p_date: date,
                    p_min_articles: 1,
                    p_max_articles: 10
                });

                if (legacyError) throw legacyError;
                articles = legacyArticles || [];
            } else {
                articles = deepArticles || [];
            }
        }

        // Final check
        if (!articles || articles.length === 0) {
            console.warn("❌ No articles found.");
            throw new Error(mode === 'quick'
                ? "Nenhum alerta recente encontrado. Verifique se você sincronizou seu Gmail."
                : "Nenhum artigo processado encontrado. Tente o modo 'Rápido' ou processe alguns alertas."
            );
        }

        // 3. Prepare AI Prompt
        console.log("📝 Preparing AI Prompt...");
        const systemPrompt = `Você é um curador e apresentador de podcast de elite, especializado em tecnologia e negócios, com capacidades avançadas de raciocínio.

REGRAS DE OURO:
1. IDIOMA: O roteiro deve ser gerado INTEGRALMENTE em PORTUGUÊS (Brasil). Traduza e resuma conteúdos em inglês naturalmente.
2. RACIOCÍNIO E INFERÊNCIA: Muitos textos são fragmentos de Gmail. Use seu conhecimento de expert para RECONSTRUIR o contexto completo. Se vir um snippet sobre uma empresa ou tecnologia, complemente com detalhes reais (ex: nomes de CEOs, impactos no mercado) para dar profundidade.
3. CONTEXTO DE CONECTIVIDADE: Não apenas relate fatos; explique as conexões entre eles (tendências de frameworks, movimentos de mercado). Pense como um arquiteto de informações.
4. FLUIDEZ NARRATIVA: Organize por temas (ex: IA, Carreira, Inovação). Use conectivos poderosos para transições suaves. Proibido listas numeradas.
5. TOM DE VOZ: Energético, pessoal e altamente profissional.

CONTEXTO DO USUÁRIO (DNA):
- Interesses: ${dna?.preferred_topics?.join(', ') || 'IA, Tecnologia'}
`;

        const articlesContext = articles.map((a: any, i: number) => `
ITEM ${i + 1}: ${a.title}
FONTE: ${a.publisher}
TIPO: ${a.source_type}
CONTEÚDO (${a.is_full_text ? 'TEXTO COMPLETO' : 'FRAGMENTO GMAIL'}): 
${a.content}
`).join('\n---\n');

        const userPrompt = `Data: ${date}. Modo: ${mode === 'quick' ? 'GIRO RÁPIDO' : 'ANÁLISE PROFUNDA'}.
Total de Itens para Curadoria: ${articles.length}.

Por favor, gere o roteiro do podcast em PORTUGUÊS seguindo as regras de agrupamento e fluidez.
Retorne JSON:
{
  "title": "${mode === 'quick' ? 'Giro Rápido: Notícias e Oportunidades' : 'Análise: ' + articles[0]?.title}",
  "description": "...",
  "script_markdown": "...",
  "topics": ["Temas tratados..."],
  "estimated_duration": 5
}`;

        // 4. Call AI & Fallback Logic
        let scriptResult: any = null;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        const openAIKey = Deno.env.get("OPENAI_API_KEY");

        // Strategy D: OpenAI ChatGPT (Tier 0 - Explicitly requested)
        if ((mode === 'chatgpt' || mode === 'chatgpt-full' || mode === 'chatgpt-quick') && openAIKey) {
            try {
                console.log(`🤖 Strategy D: Using OpenAI ChatGPT (Mode: ${mode})...`);
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${openAIKey}`
                    },
                    body: JSON.stringify({
                        model: "gpt-4o-mini", // Cost-effective and powerful
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `${userPrompt}\n\nCONTEÚDO PARA ANALISAR:\n${articlesContext}` }
                        ],
                        temperature: 0.7,
                        response_format: { type: "json_object" }
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const text = data.choices?.[0]?.message?.content;
                    if (text) scriptResult = JSON.parse(text);
                } else {
                    const errText = await response.text();
                    console.error(`OpenAI Error: ${response.status} - ${errText}`);
                }
            } catch (e: any) {
                console.error("AI Strategy D (OpenAI) failed:", e.message);
            }
        }

        // Strategy A: OpenRouter (Preferred for other modes)
        if (!scriptResult && openRouterKey) {
            // High-performance free models prioritized based on provided documentation
            const models = [
                "deepseek/deepseek-r1:free", // Top reasoning performance
                "meta-llama/llama-3.3-70b-instruct:free", // Excellent multilingual/Portuguese
                "google/gemini-2.0-flash-exp:free",
                "mistralai/mistral-large-2411:free",
                "google/gemini-flash-1.5"
            ];
            for (const model of models) {
                try {
                    console.log(`🤖 Strategy A: Trying OpenRouter with ${model}...`);
                    scriptResult = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${openRouterKey}`,
                            "HTTP-Referer": "https://supabase.com",
                            "X-Title": "Meupainel Podcast"
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: [
                                { role: "system", content: systemPrompt },
                                { role: "user", content: userPrompt }
                            ],
                            temperature: 0.6, // Slightly lower for better instruction following
                        }),
                    }).then(async (res) => {
                        if (!res.ok) {
                            const err = await res.text();
                            throw new Error(`OpenRouter ${model} failed (${res.status}): ${err}`);
                        }
                        const data = await res.json();
                        const text = data.choices?.[0]?.message?.content;
                        if (!text) throw new Error("Empty response");

                        // Clean potential <think> tokens and markdown blocks
                        const cleanText = text.replace(/<think>[\s\S]*?<\/think>/g, '').replace(/```json/g, '').replace(/```/g, '').trim();
                        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
                        if (!jsonMatch) throw new Error("Invalid JSON format in AI response");
                        return JSON.parse(jsonMatch[0]);
                    });
                    if (scriptResult) break; // Success!
                } catch (e: any) {
                    console.error(`AI Strategy A (${model}) failed:`, e.message);
                }
            }
        }

        // Strategy B: Direct Gemini (Tier 2)
        if (!scriptResult && geminiApiKey) {
            try {
                console.log("🤖 Strategy B: Trying Google Gemini Direct...");
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                            generationConfig: { temperature: 0.7, maxOutputTokens: 2000 }
                        }),
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    const jsonMatch = text?.match(/\{[\s\S]*\}/);
                    if (jsonMatch) scriptResult = JSON.parse(jsonMatch[0]);
                }
            } catch (e: any) {
                console.error("AI Strategy B failed:", e.message);
            }
        }

        // Strategy C: Fallback (Tier 3)
        if (!scriptResult || !scriptResult.script_markdown) {
            console.warn("⚠️ All AI strategies failed. Using logic fallback.");

            const fallbackTitle = "Giro Diário (Modo Simplificado)";
            let staticScript = `# ${fallbackTitle}\n\n`;
            staticScript += `> **Nota:** Este roteiro foi gerado no modo simplificado pois o processamento de IA está temporariamente ocupado.\n\n`;
            // Add error debug info (only for developer to see in UI)
            staticScript += `<!-- DEBUG: OpenRouter e Gemini falharam. Verifique cotas e chaves. -->\n\n`;
            staticScript += `Olá! Aqui estão as atualizações de hoje.\n\n`;

            const items = articles.slice(0, 10);
            items.forEach(a => {
                staticScript += `### ${a.title}\n`;
                staticScript += `${a.content.replace(/\.\.\./g, "").substring(0, 300)}...\n\n`;
            });

            scriptResult = {
                title: fallbackTitle,
                description: "Podcast gerado localmente (IA fora do ar).",
                script_markdown: staticScript,
                topics: ["Geral", "Fallback"],
                estimated_duration: 5
            };
        }

        // 5. Save Episode
        console.log("💾 Saving episode to database...");
        const { data: savedData, error: saveError } = await supabase
            .from("podcast_episodes")
            .upsert({
                user_id,
                episode_date: date,
                title: scriptResult.title,
                description: scriptResult.description,
                script_markdown: scriptResult.script_markdown,
                article_ids: articles.slice(0, 20).map((a: any) => a.alert_id), // Store up to 20 for reference
                total_articles: articles.length,
                estimated_duration_minutes: scriptResult.estimated_duration,
                dna_snapshot: dna,
                user_personalization_score: dna?.dna_score || 0.5
            }, { onConflict: 'user_id, episode_date' })
            .select()
            .single();

        if (saveError) {
            console.error("Database save error:", saveError);
            throw saveError;
        }

        console.log("✅ Success!");
        return new Response(JSON.stringify({ success: true, episode: savedData }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } catch (error: any) {
        console.error("🔥 FATAL ERROR:", error.message);
        return new Response(JSON.stringify({
            error: error.message,
            details: error.toString()
        }), { status: 500, headers: corsHeaders });
    }
});
