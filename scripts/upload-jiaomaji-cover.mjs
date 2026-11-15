/**
 * Upload a cover image for the 椒麻鸡 (Sichuan Numbing Chicken) recipe.
 * 
 * Usage: node scripts/upload-jiaomaji-cover.mjs [image-path]
 * 
 * If no image path is provided, uses: scripts/covers/sichuan-numbing-chicken.jpg
 * 
 * Credentials can be provided via:
 *   1. Environment variables (for Cloud Agent): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   2. .env.local file (for local development)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(envPath) {
  const values = {};
  if (!fs.existsSync(envPath)) return values;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const fileEnv = loadEnvFile(path.join(__dirname, '..', '.env.local'));
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as environment variables');
  console.error('   Or add them to .env.local');
  process.exit(1);
}

const slug = 'sichuan-numbing-chicken';
const defaultImagePath = path.join(__dirname, 'covers', 'sichuan-numbing-chicken.jpg');
const imagePath = process.argv[2] || defaultImagePath;

if (!fs.existsSync(imagePath)) {
  console.error(`❌ Image file not found: ${imagePath}`);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const imageBuffer = fs.readFileSync(imagePath);
const objectPath = `recipes/${slug}/cover.jpg`;

console.log(`📤 Uploading ${path.basename(imagePath)} to ${objectPath}...`);

const { error: uploadError } = await supabase.storage
  .from('restaurant-images')
  .upload(objectPath, imageBuffer, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: true,
  });

if (uploadError) {
  console.error(`❌ Upload failed: ${uploadError.message}`);
  process.exit(1);
}

const { data: publicUrl } = supabase.storage.from('restaurant-images').getPublicUrl(objectPath);

const { error: updateError } = await supabase
  .from('recipes')
  .update({ cover_image: publicUrl.publicUrl })
  .eq('slug', slug);

if (updateError) {
  console.error(`❌ Database update failed: ${updateError.message}`);
  process.exit(1);
}

console.log(`✅ Successfully uploaded cover for 椒麻鸡 (${slug})`);
console.log(`   URL: ${publicUrl.publicUrl}`);
