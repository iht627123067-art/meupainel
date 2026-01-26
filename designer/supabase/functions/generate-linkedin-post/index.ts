// Supabase Edge Function: generate-linkedin-post
// Generates LinkedIn post draft using AI (Gemini)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PostDraft {
    content: string;
    hashtags: string[];
    call_to_action: string;
    tone: string;
}

/**
 * Generate LinkedIn post using Gemini API
 */
async function generateWithGemini(
    title: string,
    description: string,
    content: string,
    apiKey: string
): Promise<PostDraft> {
    const prompt = `Você é um especialista em criar posts profissionais para LinkedIn.

Com base no conteúdo a seguir, crie um post PROFISSIONAL e ENGAJADOR para LinkedIn.

O post deve:
- Ter entre 150-300 palavras
- Começar com um gancho que capture atenção
- Usar parágrafos curtos (máximo 2-3 linhas)
- Incluir emojis estratégicos (não exagerar)
- Ter uma chamada para ação no final
- Incluir 3-5 hashtags relevantes
- Manter tom profissional mas acessível

TÍTULO DO ARTIGO: ${title}

DESCRIÇÃO: ${description}

CONTEÚDO (resumo):
${content.slice(0, 1500)}

Responda APENAS com um JSON válido:
{
  "content": "texto do post aqui...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "pergunta ou chamada para interação",
  "tone": "profissional/inspirador/educativo"
}`;

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini API Error (${response.status}):`, errorText);
        // Fallback to gemini-1.5-flash if 3.0 is not available
        if (response.status === 404 || response.status === 400) {
            console.warn("Gemini 3.0 Flash Preview not found, falling back to 1.5 Flash");
            return generateWithGeminiFallback(title, description, content, apiKey);
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
        throw new Error("No response from Gemini API");
    }

    // Extract JSON from response
    let jsonStr = textResponse;
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    } else {
        const rawJsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (rawJsonMatch) {
            jsonStr = rawJsonMatch[0];
        }
    }

    try {
        const result = JSON.parse(jsonStr);
        return {
            content: result.content || "",
            hashtags: result.hashtags || [],
            call_to_action: result.call_to_action || "",
            tone: result.tone || "profissional",
        };
    } catch (e) {
        // Return the raw text as content if JSON parsing fails
        return {
            content: textResponse,
            hashtags: [],
            call_to_action: "O que você acha? Comente abaixo!",
            tone: "profissional",
        };
    }
}

/**
 * Fallback: Generate LinkedIn post using Gemini 2.5 Flash
 * Used when 3.0 Preview is not available
 */
async function generateWithGeminiFallback(
    title: string,
    description: string,
    content: string,
    apiKey: string
): Promise<PostDraft> {
    const prompt = `Você é um especialista em criar posts profissionais para LinkedIn.

Com base no conteúdo a seguir, crie um post PROFISSIONAL e ENGAJADOR para LinkedIn.

O post deve:
- Ter entre 150-300 palavras
- Começar com um gancho que capture atenção
- Usar parágrafos curtos (máximo 2-3 linhas)
- Incluir emojis estratégicos (não exagerar)
- Ter uma chamada para ação no final
- Incluir 3-5 hashtags relevantes
- Manter tom profissional mas acessível

TÍTULO DO ARTIGO: ${title}

DESCRIÇÃO: ${description}

CONTEÚDO (resumo):
${content.slice(0, 1500)}

Responda APENAS com um JSON válido:
{
  "content": "texto do post aqui...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "pergunta ou chamada para interação",
  "tone": "profissional/inspirador/educativo"
}`;

    // Using 1.5 Flash as fallback
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Gemini 2.5 Fallback API Error (${response.status}):`, errorText);
        throw new Error(`Gemini 2.5 API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
        throw new Error("No response from Gemini API (Fallback)");
    }

    // Extract JSON from response
    let jsonStr = textResponse;
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    } else {
        const rawJsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (rawJsonMatch) {
            jsonStr = rawJsonMatch[0];
        }
    }

    try {
        const result = JSON.parse(jsonStr);
        return {
            content: result.content || "",
            hashtags: result.hashtags || [],
            call_to_action: result.call_to_action || "",
            tone: result.tone || "profissional",
        };
    } catch (e) {
        return {
            content: textResponse,
            hashtags: [],
            call_to_action: "O que você acha? Comente abaixo!",
            tone: "profissional",
        };
    }
}

/**
 * Generate LinkedIn post using Vertex AI (URL provided by user)
 */
async function generateWithVertex(
    title: string,
    description: string,
    content: string,
    apiKey: string
): Promise<PostDraft> {
    const prompt = `Você é um especialista em criar posts profissionais para LinkedIn.

Com base no conteúdo a seguir, crie um post PROFISSIONAL e ENGAJADOR para LinkedIn.

O post deve:
- Ter entre 150-300 palavras
- Começar com um gancho que capture atenção
- Usar parágrafos curtos (máximo 2-3 linhas)
- Incluir emojis estratégicos (não exagerar)
- Ter uma chamada para ação no final
- Incluir 3-5 hashtags relevantes
- Manter tom profissional mas acessível

TÍTULO DO ARTIGO: ${title}

DESCRIÇÃO: ${description}

CONTEÚDO (resumo):
${content.slice(0, 1500)}

Responda APENAS com um JSON válido:
{
  "content": "texto do post aqui...",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
  "call_to_action": "pergunta ou chamada para interação",
  "tone": "profissional/inspirador/educativo"
}`;

    // Using the user-provided endpoint structure, but with generateContent for simplicity (non-streaming)
    // Model: gemini-2.5-flash-lite per user snippet, or fallback to reliable one if needed.
    // User snippet: https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${API_KEY}
    // We will use generateContent instead of streamGenerateContent to get a single JSON response.
    const response = await fetch(
        `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1000,
                },
            }),
        }
    );

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`Vertex AI Error (${response.status}):`, errorText);
        throw new Error(`Vertex AI error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
        throw new Error("No response from Vertex AI");
    }

    // Extract JSON from response
    let jsonStr = textResponse;
    const jsonMatch = textResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
        jsonStr = jsonMatch[1].trim();
    } else {
        const rawJsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (rawJsonMatch) {
            jsonStr = rawJsonMatch[0];
        }
    }

    try {
        const result = JSON.parse(jsonStr);
        return {
            content: result.content || "",
            hashtags: result.hashtags || [],
            call_to_action: result.call_to_action || "",
            tone: result.tone || "profissional",
        };
    } catch (e) {
        return {
            content: textResponse,
            hashtags: [],
            call_to_action: "O que você acha? Comente abaixo!",
            tone: "profissional",
        };
    }
}

/**
 * Fallback: Generate simple post without AI
 */
function generateSimplePost(title: string, description: string): PostDraft {
    const content = `📰 ${title}

${description}

💡 Este conteúdo aborda um tema relevante que merece nossa atenção.

Gostaria de saber sua opinião sobre o assunto. Como você vê essa questão?

#profissional #insights #tendencias`;

    return {
        content,
        hashtags: ["#profissional", "#insights", "#tendencias"],
        call_to_action: "Gostaria de saber sua opinião sobre o assunto.",
        tone: "profissional",
    };
}

/**
 * Generate LinkedIn post using OpenAI (ChatGPT)
 */
async function generateWithOpenAI(
    title: string,
    description: string,
    content: string,
    apiKey: string
): Promise<PostDraft> {
    const prompt = `Você é um especialista em criar posts profissionais para LinkedIn.
    Com base no conteúdo a seguir, crie um post PROFISSIONAL e ENGAJADOR para LinkedIn.

    O post deve:
    - Ter entre 150-300 palavras
    - Começar com um gancho que capture atenção
    - Usar parágrafos curtos (máximo 2-3 linhas)
    - Incluir emojis estratégicos (não exagerar)
    - Ter uma chamada para ação no final
    - Incluir 3-5 hashtags relevantes
    - Manter tom profissional mas acessível

    TÍTULO: ${title}
    DESCRIÇÃO: ${description}
    CONTEÚDO: ${content.slice(0, 3000)}

    Responda apenas com este JSON:
    {
      "content": "...",
      "hashtags": ["...", "..."],
      "call_to_action": "...",
      "tone": "..."
    }`;

    try {
        console.log(`🤖 Attempting OpenAI post generation (gpt-4o-mini)`);
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: [
                    { role: "system", content: "Você é um redator sênior especializado em LinkedIn. Responda apenas com JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                response_format: { type: "json_object" }
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
                const result = JSON.parse(text);
                return {
                    content: result.content || "",
                    hashtags: result.hashtags || [],
                    call_to_action: result.call_to_action || "",
                    tone: result.tone || "profissional",
                };
            }
        }
        throw new Error(`OpenAI failed: ${response.status}`);
    } catch (e: any) {
        console.warn(`      ⚠️ OpenAI throw: ${e.message}`);
        throw e;
    }
}

/**
 * Generate LinkedIn post using OpenRouter
 */
async function generateWithOpenRouter(
    title: string,
    description: string,
    content: string,
    apiKey: string
): Promise<PostDraft> {
    const prompt = `Você é um especialista em criar posts profissionais para LinkedIn.
    Com base no conteúdo a seguir, crie um post PROFISSIONAL e ENGAJADOR para LinkedIn.

    O post deve:
    - Ter entre 150-300 palavras
    - Começar com um gancho que capture atenção
    - Usar parágrafos curtos (máximo 2-3 linhas)
    - Incluir emojis estratégicos (não exagerar)
    - Ter uma chamada para ação no final
    - Incluir 3-5 hashtags relevantes
    - Manter tom profissional mas acessível

    TÍTULO DO ARTIGO: ${title}
    DESCRIÇÃO: ${description}
    CONTEÚDO (resumo): ${content.slice(0, 3000)}

    Responda APENAS com um JSON válido:
    {
      "content": "texto do post aqui...",
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "call_to_action": "pergunta ou chamada para interação",
      "tone": "profissional/inspirador/educativo"
    }`;

    try {
        console.log(`🤖 Attempting OpenRouter post generation (google/gemini-2.0-flash-exp:free)`);
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://supabase.com",
                "X-Title": "Meupainel"
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash-exp:free",
                messages: [
                    { role: "system", content: "Você é um redator sênior especializado em LinkedIn. Responda apenas com JSON." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            const text = data.choices?.[0]?.message?.content;
            if (text) {
                console.log(`📡 OpenRouter response received`);
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                const jsonStr = jsonMatch ? jsonMatch[0] : text;
                const result = JSON.parse(jsonStr);
                return {
                    content: result.content || "",
                    hashtags: result.hashtags || [],
                    call_to_action: result.call_to_action || "",
                    tone: result.tone || "profissional",
                };
            }
        }
        throw new Error(`OpenRouter failed: ${response.status}`);
    } catch (e: any) {
        console.warn(`      ⚠️ OpenRouter throw: ${e.message}`);
        throw e;
    }
}

Deno.serve(async (req: Request) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    let alert_id = "unknown"; // Capture for error logging

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
        const openAIKey = Deno.env.get("OPENAI_API_KEY");
        const openRouterKey = Deno.env.get("OPENROUTER_API_KEY");
        const vertexApiKey = Deno.env.get("VERTEX_API_KEY") || Deno.env.get("GEMINI_API_KEY"); // Allow sharing key if same provider type
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json();
        alert_id = body.alert_id;
        const user_id = body.user_id;
        const is_auto = body.is_auto || false;

        if (!alert_id || !user_id) {
            return new Response(
                JSON.stringify({ error: "Missing required fields: alert_id, user_id" }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get alert data
        const { data: alert, error: alertError } = await supabase
            .from("alerts")
            .select("id, title, description, clean_url, url, status")
            .eq("id", alert_id)
            .single();

        if (alertError || !alert) {
            throw new Error("Alert not found");
        }

        // Validate alert status before generating post
        if (!alert.status || !['classified', 'approved'].includes(alert.status)) {
            return new Response(
                JSON.stringify({
                    error: `Alert deve estar 'classified' ou 'approved' para gerar post. Status atual: ${alert.status}`
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get extracted content if available
        const { data: content } = await supabase
            .from("extracted_content")
            .select("cleaned_content")
            .eq("alert_id", alert_id)
            .single();

        // Get classification
        const { data: classification } = await supabase
            .from("ai_classifications")
            .select("id")
            .eq("alert_id", alert_id)
            .single();

        let draft: PostDraft | null = null;
        let generated = false;
        let usedProvider = "";

        // 1. Try OpenRouter (New Priority)
        if (!generated && openRouterKey) {
            try {
                draft = await generateWithOpenRouter(
                    alert.title,
                    alert.description || "",
                    content?.cleaned_content || alert.description || "",
                    openRouterKey
                );
                generated = true;
                usedProvider = "openrouter";
            } catch (err) {
                console.error("OpenRouter post generation failed, trying fallbacks:", err);
            }
        }

        // 2. Try OpenAI
        if (!generated && openAIKey) {
            try {
                draft = await generateWithOpenAI(
                    alert.title,
                    alert.description || "",
                    content?.cleaned_content || alert.description || "",
                    openAIKey
                );
                generated = true;
                usedProvider = "openai";
            } catch (err) {
                console.error("OpenAI post generation failed, trying Gemini fallback:", err);
            }
        }

        // 3. Try Gemini (Google AI Studio)
        if (!generated && geminiApiKey) {
            try {
                draft = await generateWithGemini(
                    alert.title,
                    alert.description || "",
                    content?.cleaned_content || alert.description || "",
                    geminiApiKey
                );
                generated = true;
                usedProvider = "gemini";
            } catch (err) {
                console.error("Gemini API failed, trying Vertex fallback:", err);
            }
        }

        // 4. Try Vertex AI (if others failed or keys missing)
        if (!generated && vertexApiKey) {
            try {
                draft = await generateWithVertex(
                    alert.title,
                    alert.description || "",
                    content?.cleaned_content || alert.description || "",
                    vertexApiKey
                );
                generated = true;
                usedProvider = "vertex";
            } catch (err) {
                console.error("Vertex API failed:", err);
            }
        }

        // 5. Fallback to Simple Post
        if (!generated) {
            console.warn("[generate-linkedin-post] AI generation failed or keys missing. Using simple generation.");
            draft = generateSimplePost(alert.title, alert.description || "");
            usedProvider = "none";
        }

        // Ensure draft is assigned (should be by now)
        if (!draft) {
            draft = generateSimplePost(alert.title, alert.description || "");
        }

        // Add source URL to content
        const fullContent = `${draft.content}

🔗 Fonte: ${alert.clean_url || alert.url}

${draft.hashtags.join(" ")}`;

        // Prepara metadados JSONB
        const aiMetadata = {
            tone: draft.tone,
            hashtags: draft.hashtags,
            call_to_action: draft.call_to_action,
            provider: usedProvider,
            generated_at: new Date().toISOString()
        };

        // Check if post already exists for this alert
        const { data: existingPost } = await supabase
            .from("linkedin_posts")
            .select("id")
            .eq("alert_id", alert_id)
            .single();

        if (existingPost) {
            // Update existing draft
            const { error: updateError } = await (supabase
                .from("linkedin_posts")
                .update({
                    draft_content: fullContent,
                    ai_metadata: aiMetadata,
                    status: "draft",
                    updated_at: new Date().toISOString()
                } as any)
                .eq("id", existingPost.id));

            if (updateError) throw updateError;
        } else {
            // Create new post
            const { error: insertError } = await (supabase
                .from("linkedin_posts")
                .insert({
                    user_id,
                    alert_id,
                    draft_content: fullContent,
                    ai_metadata: aiMetadata,
                    auto_generated: is_auto,
                    status: "draft",
                } as any));

            if (insertError) throw insertError;
        }

        // Update classification as approved if exists
        if (classification) {
            await supabase
                .from("ai_classifications")
                .update({ is_approved: true, approved_at: new Date().toISOString() })
                .eq("id", classification.id);
        }

        return new Response(
            JSON.stringify({
                success: true,
                draft: {
                    content: fullContent,
                    tone: draft.tone,
                    call_to_action: draft.call_to_action,
                },
                message: "Rascunho do post gerado com sucesso!",
                provider: usedProvider
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[generate-linkedin-post] Error:", {
            error: message,
            alert_id: alert_id,
            timestamp: new Date().toISOString(),
            stack: error instanceof Error ? error.stack : undefined
        });

        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
