#!/usr/bin/env node

/**
 * Fetch and parse Google News RSS feed to see the original structure
 */

const feedUrl = 'https://news.google.com/rss/search?q="artificial+intelligence"&hl=en&gl=US&ceid=US:en';

async function fetchRSS() {
  console.log('📡 Fetching RSS Feed...\n');
  console.log(`URL: ${feedUrl}\n`);
  
  const response = await fetch(feedUrl);
  const xml = await response.text();
  
  console.log('First 2000 characters of RSS feed:');
  console.log('='.repeat(80));
  console.log(xml.substring(0, 2000));
  console.log('='.repeat(80));
  
  // Look for item entries
  const itemMatches = xml.match(/\u003citem\u003e[\s\S]*?\u003c\/item\u003e/g);
  if (itemMatches) {
    console.log(`\n\nFound ${itemMatches.length} items in feed`);
    console.log('\nFirst item:');
    console.log('-'.repeat(80));
    console.log(itemMatches[0]);
    console.log('-'.repeat(80));
    
    // Extract link from first item
    const linkMatch = itemMatches[0].match(/\u003clink\u003e(.*?)\u003c\/link\u003e/);
    if (linkMatch) {
      console.log(`\n📍 Link from RSS: ${linkMatch[1]}`);
    }
    
    // Check for other URL fields
    const guidMatch = itemMatches[0].match(/\u003cguid[^>]*\u003e(.*?)\u003c\/guid\u003e/);
    if (guidMatch) {
      console.log(`📍 GUID from RSS: ${guidMatch[1]}`);
    }
    
    const sourceMatch = itemMatches[0].match(/\u003csource[^>]*url="([^"]+)"/);
    if (sourceMatch) {
      console.log(`📍 Source URL: ${sourceMatch[1]}`);
    }
  }
}

fetchRSS().catch(console.error);
