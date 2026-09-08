import fs from 'node:fs';
import { createClient } from '@supabase/supabase-js';

function loadEnvFile(path) {
  const values = {};
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    values[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
  return values;
}

const env = loadEnvFile('.env.local');
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data: recipes, error } = await supabase
  .from('recipes')
  .select('id, slug, title_en')
  .contains('tags', ['私房'])
  .order('slug');

if (error) throw error;
if (!recipes?.length) throw new Error('No private recipes tagged 私房 were found.');

let uploaded = 0;
const failed = [];

for (const recipe of recipes) {
  try {
    const seed = [...recipe.slug].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7);
    const prompt = `premium editorial food photography of ${recipe.title_en}, authentic plated dish, warm natural light, overhead 45 degree angle, clean dark stone background, no people, no text, no logo, no watermark`;
    const source = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=640&height=640&seed=${seed}&nologo=true`;
    const response = await fetch(source);
    if (!response.ok) throw new Error(`download failed (${response.status})`);

    const objectPath = `recipes/${recipe.slug}/cover.jpg`;
    const { error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(objectPath, await response.arrayBuffer(), {
        contentType: response.headers.get('content-type') ?? 'image/jpeg',
        cacheControl: '31536000',
        upsert: true,
      });
    if (uploadError) throw uploadError;

    const { data: publicUrl } = supabase.storage.from('restaurant-images').getPublicUrl(objectPath);
    const { error: updateError } = await supabase
      .from('recipes')
      .update({ cover_image: publicUrl.publicUrl })
      .eq('id', recipe.id);
    if (updateError) throw updateError;

    uploaded += 1;
    console.log(`Uploaded ${uploaded}/${recipes.length}: ${recipe.slug}`);
  } catch (uploadError) {
    failed.push(recipe.slug);
    console.error(`Failed ${recipe.slug}: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
  }
}

console.log(`Complete: ${uploaded} uploaded, ${failed.length} failed.`);
if (failed.length) process.exitCode = 1;
