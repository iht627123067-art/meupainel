#!/usr/bin/env node

/**
 * Test Google News URL resolution
 */

const testUrl = 'https://news.google.com/rss/articles/CBMinwFBVV95cUxPM0c1TzdheXk2LVRRMXJsUkp2dkZVa0dkRDNJX2xucDNjUmdjRDBpN2pZc1c0YzRCdGFOV3FiOXc2azFjLU1vcF80UEVlNzVkVXAwRG1BUzNuTnRlLUhELWVpSkpaeUg5VGxvTVBnaWgwVm50SnQxaFB1dXBMRkxpZDNaazV5UmdjWHJZMmlxeUJBOGJ3OS1lVnA3N0hpdms?oc=5';

async function testResolution() {
    console.log('🔍 Testing Google News URL Resolution\n');
    console.log(`Original URL: ${testUrl}\n`);

    // Strategy 1: URL Parameter
    console.log('📍 Strategy 1: URL Parameter Decoding');
    try {
        const urlObj = new URL(testUrl);
        const urlParam = urlObj.searchParams.get('url');
        if (urlParam) {
            console.log(`✅ Found 'url' parameter: ${decodeURIComponent(urlParam)}`);
        } else {
            console.log(`❌ No 'url' parameter found`);
            console.log(`   Available params: ${Array.from(urlObj.searchParams.keys()).join(', ')}`);
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }

    // Strategy 2: HTTP Redirect
    console.log('\n📍 Strategy 2: HTTP Redirect Following');
    try {
        const response = await fetch(testUrl, {
            method: 'HEAD',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        console.log(`   Status: ${response.status}`);
        console.log(`   Final URL: ${response.url}`);

        if (!response.url.includes('google.com')) {
            console.log(`✅ Successfully resolved to non-Google URL`);
        } else {
            console.log(`❌ Still on Google domain`);
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }

    // Strategy 3: GET and parse HTML
    console.log('\n📍 Strategy 3: Parse HTML');
    try {
        const response = await fetch(testUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            }
        });

        const html = await response.text();
        console.log(`   Response length: ${html.length} chars`);
        console.log(`   First 500 chars:\n${html.substring(0, 500)}`);

        // Look for links
        const linkMatches = html.match(/https?:\/\/[^"'\s<>]+/g);
        if (linkMatches) {
            const nonGoogleLinks = linkMatches.filter(link => !link.includes('google.com'));
            console.log(`\n   Found ${nonGoogleLinks.length} non-Google links:`);
            nonGoogleLinks.slice(0, 5).forEach(link => console.log(`     - ${link}`));
        }
    } catch (e) {
        console.log(`❌ Error: ${e.message}`);
    }
}

testResolution();
