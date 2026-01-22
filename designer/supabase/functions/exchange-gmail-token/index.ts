// Supabase Edge Function: exchange-gmail-token
// Exchanges OAuth authorization code for access/refresh tokens

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GoogleTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
}

interface GoogleUserInfo {
    email: string;
    verified_email: boolean;
}

async function exchangeCodeForTokens(
    code: string,
    redirectUri: string
): Promise<GoogleTokenResponse> {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
        throw new Error("Missing Google OAuth credentials");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Token exchange failed:", error);
        throw new Error(`Token exchange failed: ${response.status}`);
    }

    return response.json();
}

async function getUserEmail(accessToken: string): Promise<string> {
    const response = await fetch(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    if (!response.ok) {
        throw new Error("Failed to get user info");
    }

    const userInfo: GoogleUserInfo = await response.json();
    return userInfo.email;
}

async function refreshAccessToken(refreshToken: string): Promise<GoogleTokenResponse> {
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

    if (!clientId || !clientSecret) {
        throw new Error("Missing Google OAuth credentials");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "refresh_token",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        console.error("Token refresh failed:", error);
        throw new Error(`Token refresh failed: ${response.status}`);
    }

    return response.json();
}

Deno.serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const body = await req.json().catch(() => ({}));
        const { code, redirect_uri, email_account_id, user_id, action } = body;

        // Action: refresh existing token
        if (action === "refresh") {
            if (!email_account_id) {
                return new Response(
                    JSON.stringify({ error: "Missing email_account_id" }),
                    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Get existing token
            const { data: tokenData, error: tokenError } = await supabase
                .from("gmail_oauth_tokens")
                .select("*")
                .eq("email_account_id", email_account_id)
                .single();

            if (tokenError || !tokenData) {
                return new Response(
                    JSON.stringify({ error: "Token not found", details: tokenError?.message }),
                    { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Check if token needs refresh
            const expiresAt = new Date(tokenData.token_expires_at);
            const now = new Date();
            const bufferMinutes = 5;

            if (expiresAt.getTime() - now.getTime() > bufferMinutes * 60 * 1000) {
                // Token still valid
                return new Response(
                    JSON.stringify({
                        success: true,
                        access_token: tokenData.access_token,
                        message: "Token still valid"
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }

            // Refresh the token
            const newTokens = await refreshAccessToken(tokenData.refresh_token);
            const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000);

            // Update in database
            const { error: updateError } = await supabase
                .from("gmail_oauth_tokens")
                .update({
                    access_token: newTokens.access_token,
                    token_expires_at: newExpiresAt.toISOString(),
                    scope: newTokens.scope,
                })
                .eq("email_account_id", email_account_id);

            if (updateError) {
                throw updateError;
            }

            return new Response(
                JSON.stringify({
                    success: true,
                    access_token: newTokens.access_token,
                    message: "Token refreshed"
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Action: exchange code for tokens (default)
        if (!code || !redirect_uri || !email_account_id || !user_id) {
            return new Response(
                JSON.stringify({
                    error: "Missing required fields: code, redirect_uri, email_account_id, user_id"
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        console.log(`Exchanging OAuth code for email_account_id: ${email_account_id}`);

        // Exchange code for tokens
        const tokens = await exchangeCodeForTokens(code, redirect_uri);

        if (!tokens.refresh_token) {
            return new Response(
                JSON.stringify({
                    error: "No refresh token received. User may need to revoke access and try again."
                }),
                { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Get the Gmail address
        const gmailAddress = await getUserEmail(tokens.access_token);
        console.log(`Authenticated as: ${gmailAddress}`);

        // Calculate token expiration
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

        // Upsert token record
        const { error: upsertError } = await supabase
            .from("gmail_oauth_tokens")
            .upsert({
                email_account_id,
                user_id,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_expires_at: expiresAt.toISOString(),
                scope: tokens.scope,
            }, {
                onConflict: "email_account_id",
            });

        if (upsertError) {
            console.error("Database upsert error:", upsertError);
            throw upsertError;
        }

        // Update email_account to mark as connected
        const { error: updateError } = await supabase
            .from("email_accounts")
            .update({
                oauth_connected: true,
                email: gmailAddress, // Update email in case it differs
            })
            .eq("id", email_account_id);

        if (updateError) {
            console.error("Email account update error:", updateError);
            throw updateError;
        }

        return new Response(
            JSON.stringify({
                success: true,
                email: gmailAddress,
                message: "Gmail account connected successfully",
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Error in exchange-gmail-token:", message);
        return new Response(
            JSON.stringify({ error: message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
