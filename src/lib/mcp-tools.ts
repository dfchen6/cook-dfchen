import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { adminAuth } from '@/lib/firebase/admin';
import { addMealPlan } from '@/lib/data/meal-plans';
import {
  deleteRecipeBySlug,
  getRecipeBySlugRaw,
  listAllRecipes,
  updateRecipeFieldsBySlug,
  upsertRecipeBySlug,
} from '@/lib/data/recipes';

// The MCP route is authenticated with MCP_API_KEY and acts as the owner,
// so it uses the Admin SDK directly (no per-user visibility filtering).

const IngredientSchema = z.object({
  name_zh: z.string().describe('Ingredient name in Chinese e.g. 五花肉'),
  name_en: z.string().describe('Ingredient name in English e.g. pork belly'),
  quantity: z.string().describe('Amount e.g. 500'),
  unit: z.string().describe('Unit e.g. g, tbsp, pieces'),
});

export function registerTools(server: McpServer) {
  // ─── list_recipes ────────────────────────────────────────────────────────

  server.tool(
    'list_recipes',
    'List all recipes with titles and tags',
    {},
    async () => {
      let data;
      try {
        data = await listAllRecipes();
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }] };
      }

      const text = data.map(r =>
        `• ${r.title_zh} (${r.title_en}) — slug: ${r.slug}${r.is_public ? '' : ' 🔒 private'}${r.tags?.length ? ` [${r.tags.join(', ')}]` : ''}`
      ).join('\n');

      return { content: [{ type: 'text' as const, text: text || 'No recipes yet.' }] };
    }
  );

  // ─── get_recipe ──────────────────────────────────────────────────────────

  server.tool(
    'get_recipe',
    'Get full details of a recipe including ingredients and instructions',
    { slug: z.string().describe('The recipe slug') },
    async ({ slug }) => {
      const data = await getRecipeBySlugRaw(slug);
      if (!data) return { content: [{ type: 'text' as const, text: `Recipe "${slug}" not found.` }] };

      const ings = data.ingredients
        .map(i => `  - ${i.name_zh} (${i.name_en}): ${i.quantity} ${i.unit}`)
        .join('\n');

      const shares = data.shared_with;
      const visibility = data.is_public ? 'public' : `private${shares.length ? `, shared with: ${shares.join(', ')}` : ''}`;

      const text = `${data.title_zh} · ${data.title_en}
Slug: ${data.slug} | Servings: ${data.servings ?? '—'} | Prep: ${data.prep_time_mins ?? '—'}min | Cook: ${data.cook_time_mins ?? '—'}min
Tags: ${data.tags?.join(', ') || 'none'}
Visibility: ${visibility}

Ingredients:
${ings}

Instructions:
${data.instructions}`.trim();

      return { content: [{ type: 'text' as const, text }] };
    }
  );

  // ─── add_recipe ──────────────────────────────────────────────────────────

  server.tool(
    'add_recipe',
    'Add a new recipe. Always provide both Chinese and English titles and ingredient names.',
    {
      slug: z.string().describe('URL-friendly slug e.g. ma-po-tofu'),
      title_zh: z.string().describe('Chinese title e.g. 麻婆豆腐'),
      title_en: z.string().describe('English title e.g. Mapo Tofu'),
      instructions: z.string().describe('Instructions — mixed Chinese/English is fine'),
      instructions_zh: z.string().optional().describe('Clean Chinese version'),
      instructions_en: z.string().optional().describe('Clean English version'),
      description_zh: z.string().optional(),
      description_en: z.string().optional(),
      locale_primary: z.enum(['zh', 'en']).default('zh'),
      cover_image: z.string().optional().describe('Cover image URL'),
      youtube_url: z.string().optional().describe('Video URL — YouTube (embedded) or Xiaohongshu/小红书 (shown as a link)'),
      prep_time_mins: z.number().optional(),
      cook_time_mins: z.number().optional(),
      servings: z.number().optional(),
      tags: z.array(z.string()).default([]),
      is_public: z.boolean().default(true).describe('false = only visible to the owner and shared_with emails'),
      shared_with: z.array(z.string()).default([]).describe('Emails allowed to view when is_public is false'),
      ingredients: z.array(IngredientSchema),
    },
    async ({ ingredients, shared_with, ...fields }) => {
      // Enforce unique slugs so add_recipe doesn't silently overwrite an existing recipe.
      if (await getRecipeBySlugRaw(fields.slug)) {
        return { content: [{ type: 'text' as const, text: `Error: a recipe with slug "${fields.slug}" already exists. Use update_recipe.` }] };
      }
      const recipe = { ...fields };
      try {
        await upsertRecipeBySlug({ ...fields, shared_with, ingredients: ingredients.map((ing, i) => ({ ...ing, sort_order: i })) });
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: `✓ Added "${recipe.title_zh} · ${recipe.title_en}" with ${ingredients.length} ingredients.\nhttps://cook.dfchen.com/zh/recipes/${recipe.slug}`,
        }],
      };
    }
  );

  // ─── update_recipe ───────────────────────────────────────────────────────

  server.tool(
    'update_recipe',
    'Update fields on an existing recipe',
    {
      slug: z.string(),
      title_zh: z.string().optional(),
      title_en: z.string().optional(),
      instructions: z.string().optional(),
      instructions_zh: z.string().optional(),
      instructions_en: z.string().optional(),
      description_zh: z.string().optional(),
      description_en: z.string().optional(),
      cover_image: z.string().optional().describe('Cover image URL'),
      youtube_url: z.string().optional().describe('Video URL — YouTube (embedded) or Xiaohongshu/小红书 (shown as a link)'),
      prep_time_mins: z.number().optional(),
      cook_time_mins: z.number().optional(),
      servings: z.number().optional(),
      tags: z.array(z.string()).optional(),
      is_public: z.boolean().optional().describe('false = only visible to the owner and shared emails'),
      shared_with: z.array(z.string()).optional().describe('Replaces the full list of emails allowed to view when private'),
    },
    async ({ slug, shared_with, ...fields }) => {
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (!Object.keys(updates).length && shared_with === undefined) {
        return { content: [{ type: 'text' as const, text: 'No fields to update.' }] };
      }

      let found: boolean;
      try {
        found = await updateRecipeFieldsBySlug(slug, { ...updates, ...(shared_with !== undefined ? { shared_with } : {}) });
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }] };
      }
      if (!found) return { content: [{ type: 'text' as const, text: `Error: Recipe "${slug}" not found.` }] };

      return { content: [{ type: 'text' as const, text: `✓ Updated "${slug}".` }] };
    }
  );

  // ─── delete_recipe ───────────────────────────────────────────────────────

  server.tool(
    'delete_recipe',
    'Delete a recipe and all its ingredients',
    { slug: z.string() },
    async ({ slug }) => {
      try {
        await deleteRecipeBySlug(slug);
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }] };
      }
      return { content: [{ type: 'text' as const, text: `✓ Deleted "${slug}".` }] };
    }
  );

  // ─── add_to_meal_plan ────────────────────────────────────────────────────

  server.tool(
    'add_to_meal_plan',
    'Add a recipe to the meal plan on a specific date',
    {
      recipe_slug: z.string(),
      planned_date: z.string().describe('YYYY-MM-DD'),
      meal_type: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).default('dinner'),
      notes: z.string().optional(),
    },
    async ({ recipe_slug, planned_date, meal_type, notes }) => {
      const recipe = await getRecipeBySlugRaw(recipe_slug);
      if (!recipe) return { content: [{ type: 'text' as const, text: `Recipe "${recipe_slug}" not found.` }] };

      const ownerEmail = process.env.OWNER_EMAIL!;
      let uid: string;
      try {
        uid = (await adminAuth().getUserByEmail(ownerEmail)).uid;
      } catch {
        return { content: [{ type: 'text' as const, text: `Owner "${ownerEmail}" not found.` }] };
      }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(planned_date)) {
        return { content: [{ type: 'text' as const, text: 'Error: planned_date must be YYYY-MM-DD.' }] };
      }

      try {
        await addMealPlan(uid, { recipe_id: recipe.id, planned_date, meal_type, notes: notes ?? null });
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Error: ${(error as Error).message}` }] };
      }
      return {
        content: [{
          type: 'text' as const,
          text: `✓ Added "${recipe.title_zh}" to meal plan on ${planned_date} (${meal_type}).`,
        }],
      };
    }
  );
}
