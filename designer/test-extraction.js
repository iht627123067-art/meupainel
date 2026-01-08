#!/usr/bin/env node

/**
 * Test script to manually trigger content extraction for a pending alert
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://peoyosdnthdpnhejivqo.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_ANON_KEY) {
    console.error('❌ SUPABASE_ANON_KEY environment variable is required');
    process.exit(1);
}

async function testExtraction() {
    // Test alert from database
    const testAlert = {
        id: '32649109-3c01-4da0-8e9f-889049715ea0',
        title: 'Copyright in Generative Artificial Intelligence - SCIRP Open Access',
        url: 'https://news.google.com/rss/articles/CBMibkFVX3lxTE5XdVREVl9XZTBzX1BXYi1VYm5NcW9CX2ZITXJFemdWTjhUY0FTeDNNMDA2dEIwNlpxOThfRDhxdi1kM2RNQlVCZUNkeGJGLVJDN0N1SVpqMGFEMHlsa2NhcnlYTG1JSXNMVGRIM01n?oc=5'
    };

    console.log('\n🧪 Testing Content Extraction');
    console.log('================================\n');
    console.log(`Alert ID: ${testAlert.id}`);
    console.log(`Title: ${testAlert.title}`);
    console.log(`URL: ${testAlert.url}\n`);

    try {
        console.log('📡 Calling extract-content edge function...\n');

        const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-content`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
                alert_id: testAlert.id
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Extraction failed:');
            console.error(JSON.stringify(data, null, 2));
            process.exit(1);
        }

        console.log('✅ Extraction successful!\n');
        console.log('Results:');
        console.log('--------');
        console.log(`Word Count: ${data.word_count}`);
        console.log(`Quality Score: ${(data.quality_score * 100).toFixed(1)}%`);
        console.log(`Clean URL: ${data.clean_url}`);
        console.log(`Source: ${data.extraction_source}`);
        console.log(`\nMessage: ${data.message}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

testExtraction();
