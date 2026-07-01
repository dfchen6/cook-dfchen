import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Uses service role key — bypasses RLS for AI agent writes
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('recipes')
        .select('slug, title_zh, title_en, tags, prep_time_mins, cook_time_mins')
        .order('created_at', { ascending: false });

      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };

      const text = data.map(r =>
        `• ${r.title_zh} (${r.title_en}) — slug: ${r.slug}${r.tags?.length ? ` [${r.tags.join(', ')}]` : ''}`
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
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients(*)')
        .eq('slug', slug)
        .order('sort_order', { referencedTable: 'ingredients', ascending: true })
        .single();

      if (error || !data) return { content: [{ type: 'text' as const, text: `Recipe "${slug}" not found.` }] };

      const ings = (data.ingredients as Array<{ name_zh: string; name_en: string; quantity: string; unit: string }>)
        .map(i => `  - ${i.name_zh} (${i.name_en}): ${i.quantity} ${i.unit}`)
        .join('\n');

      const text = `${data.title_zh} · ${data.title_en}
Slug: ${data.slug} | Servings: ${data.servings ?? '—'} | Prep: ${data.prep_time_mins ?? '—'}min | Cook: ${data.cook_time_mins ?? '—'}min
Tags: ${data.tags?.join(', ') || 'none'}

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
      prep_time_mins: z.number().optional(),
      cook_time_mins: z.number().optional(),
      servings: z.number().optional(),
      tags: z.array(z.string()).default([]),
      ingredients: z.array(IngredientSchema),
    },
    async ({ ingredients, ...fields }) => {
      const supabase = getSupabase();
      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert(fields)
        .select()
        .single();

      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };

      if (ingredients.length > 0) {
        await supabase.from('ingredients').insert(
          ingredients.map((ing, i) => ({ recipe_id: recipe.id, ...ing, sort_order: i }))
        );
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
      prep_time_mins: z.number().optional(),
      cook_time_mins: z.number().optional(),
      servings: z.number().optional(),
      tags: z.array(z.string()).optional(),
    },
    async ({ slug, ...fields }) => {
      const updates = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));
      if (!Object.keys(updates).length) return { content: [{ type: 'text' as const, text: 'No fields to update.' }] };

      const supabase = getSupabase();
      const { error } = await supabase.from('recipes').update(updates).eq('slug', slug);
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      return { content: [{ type: 'text' as const, text: `✓ Updated "${slug}".` }] };
    }
  );

  // ─── delete_recipe ───────────────────────────────────────────────────────

  server.tool(
    'delete_recipe',
    'Delete a recipe and all its ingredients',
    { slug: z.string() },
    async ({ slug }) => {
      const supabase = getSupabase();
      const { error } = await supabase.from('recipes').delete().eq('slug', slug);
      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
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
      const supabase = getSupabase();

      const { data: recipe } = await supabase
        .from('recipes').select('id, title_zh, title_en').eq('slug', recipe_slug).single();
      if (!recipe) return { content: [{ type: 'text' as const, text: `Recipe "${recipe_slug}" not found.` }] };

      const ownerEmail = process.env.OWNER_EMAIL!;
      const { data: { users } } = await supabase.auth.admin.listUsers();
      const user = users.find(u => u.email === ownerEmail);
      if (!user) return { content: [{ type: 'text' as const, text: `Owner "${ownerEmail}" not found.` }] };

      const { error } = await supabase.from('meal_plans').insert({
        user_id: user.id,
        recipe_id: recipe.id,
        planned_date,
        meal_type,
        notes: notes ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      if (error) return { content: [{ type: 'text' as const, text: `Error: ${error.message}` }] };
      return {
        content: [{
          type: 'text' as const,
          text: `✓ Added "${recipe.title_zh}" to meal plan on ${planned_date} (${meal_type}).`,
        }],
      };
    }
  );
}
