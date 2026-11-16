#!/usr/bin/env node
/**
 * One-off migration: Supabase (Postgres + Auth + Storage) → Firebase (Firestore + Auth + Storage).
 *
 * Usage:
 *   node scripts/migrate-supabase-to-firebase.mjs --target=emulator            # rehearsal against local emulators
 *   node scripts/migrate-supabase-to-firebase.mjs --target=production [--wipe-existing] [--replace-conflicting-users]
 *
 *   --wipe-existing              Back up every existing Firestore collection to exports/firestore-backup-*.json,
 *                                then delete it before importing (clears the old cook-copilot app data).
 *   --replace-conflicting-users  If a Firebase Auth user already exists with the same email but a different uid,
 *                                delete it so the Supabase uid can be imported (keeps data ownership unchanged).
 *
 * Reads Supabase with the service-role key from .env.local. Writes Firebase with Application Default
 * Credentials (`gcloud auth application-default login`), or the emulators when --target=emulator.
 * Safe to re-run: documents keep their Supabase ids and are overwritten in place.
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

const args = new Set(process.argv.slice(2));
const target = [...args].find((a) => a.startsWith('--target='))?.split('=')[1];
const WIPE = args.has('--wipe-existing');
const REPLACE_USERS = args.has('--replace-conflicting-users');
if (target !== 'emulator' && target !== 'production') {
  console.error('Specify --target=emulator or --target=production');
  process.exit(1);
}

// ── env ───────────────────────────────────────────────────────────────────────
const env = {};
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
}
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const PROJECT_ID = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const BUCKET = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const OLD_BUCKET = 'restaurant-images';
const OLD_PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/${OLD_BUCKET}/`;
if (!SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !PROJECT_ID || !BUCKET) {
  console.error('Missing Supabase or Firebase settings in .env.local');
  process.exit(1);
}

if (target === 'emulator') {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8085';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199';
} else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Emulator env vars are set but --target=production was requested. Unset them first.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const app = initializeApp({ projectId: PROJECT_ID, storageBucket: BUCKET });
const auth = getAuth(app);
const db = getFirestore(app);
db.settings({ ignoreUndefinedProperties: true });
const bucket = getStorage(app).bucket();

const log = (...a) => console.log(...a);
const ts = (iso) => (iso ? Timestamp.fromDate(new Date(iso)) : Timestamp.now());

async function selectAll(table) {
  const { data, error } = await sb.from(table).select('*');
  if (error) throw new Error(`${table}: ${error.message}`);
  return data;
}

// ── 1. read Supabase ─────────────────────────────────────────────────────────
log(`Reading Supabase (${SUPABASE_URL}) …`);
const [recipes, ingredients, shares, mealPlans, googleTokens, restaurants, dishes, photos] = await Promise.all(
  ['recipes', 'ingredients', 'recipe_shares', 'meal_plans', 'google_tokens', 'restaurants', 'restaurant_dishes', 'restaurant_photos'].map(selectAll)
);
const { data: { users: listed }, error: usersError } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (usersError) throw usersError;
const users = await Promise.all(listed.map(async (u) => (await sb.auth.admin.getUserById(u.id)).data.user ?? u));
log(`  ${recipes.length} recipes, ${ingredients.length} ingredients, ${shares.length} shares, ${mealPlans.length} meal plans,`);
log(`  ${googleTokens.length} google tokens, ${restaurants.length} restaurants, ${dishes.length} dishes, ${photos.length} photos, ${users.length} users`);

// The restaurants.user_id column only exists if restaurants_per_user.sql was run; otherwise everything is the admin's.
const ownerEmail = (env.OWNER_EMAIL ?? 'dfchen6@gmail.com').toLowerCase();
const owner = users.find((u) => u.email?.toLowerCase() === ownerEmail);
if (!owner) throw new Error(`Owner ${ownerEmail} not found in Supabase Auth`);

// ── 2. optional: back up + wipe existing Firestore data ─────────────────────
async function dumpCollection(col) {
  const out = {};
  for (const doc of (await col.get()).docs) {
    const subs = {};
    for (const sub of await doc.ref.listCollections()) subs[sub.id] = await dumpCollection(sub);
    out[doc.id] = { data: doc.data(), subcollections: subs };
  }
  return out;
}

const existingCollections = await db.listCollections();
if (existingCollections.length) {
  if (!WIPE) {
    log(`Existing Firestore collections: ${existingCollections.map((c) => c.id).join(', ')} (kept; documents with the same ids are overwritten)`);
  } else {
    const backup = {};
    for (const col of existingCollections) backup[col.id] = await dumpCollection(col);
    fs.mkdirSync('exports', { recursive: true });
    const file = path.join('exports', `firestore-backup-${target}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(file, JSON.stringify(backup, null, 2));
    log(`Backed up ${existingCollections.length} collections to ${file}`);
    for (const col of existingCollections) await db.recursiveDelete(col);
    log(`Wiped: ${existingCollections.map((c) => c.id).join(', ')}`);
  }
}

// ── 3. Auth users (keep Supabase uuids as Firebase uids) ─────────────────────
const alreadyImported = new Set();
for (const u of users) {
  const email = u.email?.toLowerCase();
  try {
    const existing = await auth.getUserByEmail(email);
    if (existing.uid === u.id) {
      alreadyImported.add(u.id); // re-run: importUsers can't overwrite, and nothing needs to change
      continue;
    }
    if (!REPLACE_USERS) {
      throw new Error(`Firebase user ${email} already exists with uid ${existing.uid}. Re-run with --replace-conflicting-users to replace it.`);
    }
    await auth.deleteUser(existing.uid);
    log(`  Deleted conflicting Firebase user ${email} (${existing.uid})`);
  } catch (err) {
    if (err?.code !== 'auth/user-not-found') throw err;
  }
}
const importable = users.filter((u) => !alreadyImported.has(u.id)).map((u) => {
  const google = (u.identities ?? []).find((i) => i.provider === 'google');
  const sub = google?.identity_data?.sub ?? google?.id;
  return {
    uid: u.id,
    email: u.email?.toLowerCase(),
    emailVerified: true,
    displayName: u.user_metadata?.full_name ?? u.user_metadata?.name,
    photoURL: u.user_metadata?.avatar_url,
    // Link the Google identity so "Continue with Google" lands on the same uid.
    providerData: sub ? [{ uid: sub, providerId: 'google.com', email: u.email?.toLowerCase() }] : undefined,
    metadata: { creationTime: u.created_at, lastSignInTime: u.last_sign_in_at ?? undefined },
  };
});
const importResult = importable.length ? await auth.importUsers(importable) : { successCount: 0, failureCount: 0, errors: [] };
if (importResult.failureCount) {
  for (const e of importResult.errors) log(`  ✗ user ${importable[e.index].email}: ${e.error.message}`);
  throw new Error('User import failed');
}
log(`Imported ${importResult.successCount} auth users (${alreadyImported.size} already present)`);

// ── 4. Storage: copy referenced images, rewrite URLs ────────────────────────
const copied = new Map(); // oldPath|newPath -> new URL
async function migrateUrl(url, newPrefix) {
  if (!url || !url.startsWith(OLD_PUBLIC_PREFIX)) return url ?? null;
  const oldPath = decodeURIComponent(url.slice(OLD_PUBLIC_PREFIX.length).split('?')[0]);
  const newPath = oldPath.startsWith(`${newPrefix}/`) ? oldPath : `${newPrefix}/${oldPath.replace(/^(recipes|restaurants)\//, '')}`;
  const key = `${oldPath}|${newPath}`;
  if (copied.has(key)) return copied.get(key);

  const { data, error } = await sb.storage.from(OLD_BUCKET).download(oldPath);
  if (error) {
    log(`  ⚠ missing in Supabase storage, URL cleared: ${oldPath}`);
    copied.set(key, null);
    return null;
  }
  const token = randomUUID();
  await bucket.file(newPath).save(Buffer.from(await data.arrayBuffer()), {
    contentType: data.type || 'image/jpeg',
    metadata: { cacheControl: 'public, max-age=31536000', metadata: { firebaseStorageDownloadTokens: token } },
  });
  const host = target === 'emulator' ? `http://${process.env.FIREBASE_STORAGE_EMULATOR_HOST}` : 'https://firebasestorage.googleapis.com';
  const newUrl = `${host}/v0/b/${BUCKET}/o/${encodeURIComponent(newPath)}?alt=media&token=${token}`;
  copied.set(key, newUrl);
  log(`  copied ${oldPath} → ${newPath}`);
  return newUrl;
}

// ── 5. Firestore documents ───────────────────────────────────────────────────
let writer = db.batch();
let pending = 0;
async function put(ref, data) {
  writer.set(ref, data);
  if (++pending >= 400) {
    await writer.commit();
    writer = db.batch();
    pending = 0;
  }
}

const ingByRecipe = Map.groupBy(ingredients, (i) => i.recipe_id);
const sharesByRecipe = Map.groupBy(shares, (s) => s.recipe_id);
for (const r of recipes) {
  await put(db.collection('recipes').doc(r.id), {
    slug: r.slug,
    title_zh: r.title_zh,
    title_en: r.title_en,
    description_zh: r.description_zh,
    description_en: r.description_en,
    instructions: r.instructions ?? '',
    instructions_zh: r.instructions_zh,
    instructions_en: r.instructions_en,
    locale_primary: r.locale_primary ?? 'zh',
    cover_image: await migrateUrl(r.cover_image, 'recipes'),
    youtube_url: r.youtube_url,
    prep_time_mins: r.prep_time_mins,
    cook_time_mins: r.cook_time_mins,
    servings: r.servings,
    tags: r.tags ?? [],
    is_public: r.is_public ?? true,
    shared_with: [...new Set((sharesByRecipe.get(r.id) ?? []).map((s) => s.email.trim().toLowerCase()))],
    ingredients: (ingByRecipe.get(r.id) ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({ id: i.id, name_zh: i.name_zh, name_en: i.name_en, quantity: i.quantity, unit: i.unit ?? '', sort_order: i.sort_order })),
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  });
}
log(`Wrote ${recipes.length} recipes`);

for (const p of mealPlans) {
  await put(db.collection('users').doc(p.user_id).collection('mealPlans').doc(p.id), {
    recipe_id: p.recipe_id,
    planned_date: p.planned_date,
    meal_type: p.meal_type,
    notes: p.notes,
    google_event_id: p.google_event_id,
    created_at: ts(p.created_at),
  });
}
for (const t of googleTokens) {
  await put(db.collection('users').doc(t.user_id).collection('private').doc('googleTokens'), {
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    expiry_date: t.expiry_date != null ? Number(t.expiry_date) : null,
    updated_at: ts(t.updated_at),
  });
}
log(`Wrote ${mealPlans.length} meal plans, ${googleTokens.length} google tokens`);

const dishesBy = Map.groupBy(dishes, (d) => d.restaurant_id);
const photosBy = Map.groupBy(photos, (p) => p.restaurant_id);
for (const r of restaurants) {
  const uid = r.user_id ?? owner.id;
  const prefix = `restaurants/${uid}`;
  const restaurantDishes = [];
  for (const d of (dishesBy.get(r.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
    restaurantDishes.push({
      id: d.id, name: d.name, name_zh: d.name_zh, description: d.description,
      image_url: await migrateUrl(d.image_url, prefix), rating: d.rating, recommended: d.recommended ?? true, sort_order: d.sort_order,
    });
  }
  const restaurantPhotos = [];
  for (const p of (photosBy.get(r.id) ?? []).sort((a, b) => a.sort_order - b.sort_order)) {
    const image_url = await migrateUrl(p.image_url, prefix);
    if (image_url) restaurantPhotos.push({ id: p.id, image_url, caption: p.caption, sort_order: p.sort_order });
  }
  await put(db.collection('users').doc(uid).collection('restaurants').doc(r.id), {
    name: r.name, name_zh: r.name_zh, address: r.address, city: r.city, country: r.country, cuisine: r.cuisine,
    tags: r.tags ?? [], lat: r.lat, lng: r.lng, google_maps_url: r.google_maps_url,
    overall_rating: r.overall_rating, price_level: r.price_level, visited_at: r.visited_at, notes: r.notes,
    cover_image: await migrateUrl(r.cover_image, prefix),
    dishes: restaurantDishes,
    photos: restaurantPhotos,
    created_at: ts(r.created_at),
    updated_at: ts(r.updated_at),
  });
}
if (pending) await writer.commit();
log(`Wrote ${restaurants.length} restaurants`);

// ── 6. verify ────────────────────────────────────────────────────────────────
const recipeCount = (await db.collection('recipes').count().get()).data().count;
const ingCount = (await db.collection('recipes').get()).docs.reduce((n, d) => n + (d.data().ingredients?.length ?? 0), 0);
const restaurantCount = (await db.collectionGroup('restaurants').count().get()).data().count;
const planCount = (await db.collectionGroup('mealPlans').count().get()).data().count;
const ok = recipeCount === recipes.length && ingCount === ingredients.length && restaurantCount === restaurants.length && planCount === mealPlans.length;
log(`\nVerification (Firestore vs Supabase):`);
log(`  recipes ${recipeCount}/${recipes.length}, ingredients ${ingCount}/${ingredients.length}, restaurants ${restaurantCount}/${restaurants.length}, meal plans ${planCount}/${mealPlans.length}`);
log(`  images copied: ${[...copied.values()].filter(Boolean).length}`);
log(ok ? '✅ Migration complete' : '❌ Counts differ — investigate before cutting over');
process.exit(ok ? 0 : 1);
