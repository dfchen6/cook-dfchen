import Papa from 'papaparse';
import type { RecipeImportItem, RecipeWithIngredients } from '@/lib/supabase/types';

export const RECIPE_CSV_COLUMNS = [
  'slug',
  'title_zh',
  'title_en',
  'description_zh',
  'description_en',
  'instructions',
  'instructions_zh',
  'instructions_en',
  'locale_primary',
  'cover_image',
  'youtube_url',
  'prep_time_mins',
  'cook_time_mins',
  'servings',
  'tags_json',
  'is_public',
  'shared_with_json',
  'ingredients_json',
] as const;

type CsvColumn = (typeof RECIPE_CSV_COLUMNS)[number];
type CsvRecipeRow = Record<CsvColumn, string>;

export type CsvParseResult = {
  items: RecipeImportItem[];
  errors: string[];
};

function nullable(value: string): string | null {
  return value.trim() ? value : null;
}

function numberOrNull(value: string, field: string, rowNumber: number): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new Error(`Row ${rowNumber}: "${field}" must be a number.`);
  }
  return number;
}

function parseJson<T>(value: string, field: string, rowNumber: number): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Row ${rowNumber}: "${field}" must be valid JSON.`);
  }
}

function parseStringArray(value: string, field: string, rowNumber: number): string[] {
  const data = parseJson<unknown>(value || '[]', field, rowNumber);
  if (!Array.isArray(data) || !data.every((item) => typeof item === 'string')) {
    throw new Error(`Row ${rowNumber}: "${field}" must be a JSON array of strings.`);
  }
  return data;
}

function parseIngredients(value: string, rowNumber: number): RecipeImportItem['ingredients'] {
  const data = parseJson<unknown>(value || '[]', 'ingredients_json', rowNumber);
  if (!Array.isArray(data)) {
    throw new Error(`Row ${rowNumber}: "ingredients_json" must be a JSON array.`);
  }

  return data.map((ingredient, index) => {
    if (!ingredient || typeof ingredient !== 'object') {
      throw new Error(`Row ${rowNumber}: ingredient ${index + 1} must be an object.`);
    }

    const item = ingredient as Record<string, unknown>;
    const fields = ['name_zh', 'name_en', 'quantity', 'unit'] as const;
    if (!fields.every((field) => typeof item[field] === 'string')) {
      throw new Error(`Row ${rowNumber}: ingredient ${index + 1} is missing a required field.`);
    }
    const sortOrder = item.sort_order;
    if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || typeof sortOrder !== 'number' || sortOrder < 0)) {
      throw new Error(`Row ${rowNumber}: ingredient ${index + 1} has an invalid sort_order.`);
    }

    return {
      name_zh: item.name_zh as string,
      name_en: item.name_en as string,
      quantity: item.quantity as string,
      unit: item.unit as string,
      ...(sortOrder === undefined ? {} : { sort_order: sortOrder as number }),
    };
  });
}

function rowToRecipe(row: Record<string, string>, rowNumber: number): RecipeImportItem {
  const slug = row.slug?.trim();
  const titleZh = row.title_zh?.trim();
  const titleEn = row.title_en?.trim();
  if (!slug || !titleZh || !titleEn) {
    throw new Error(`Row ${rowNumber}: slug, title_zh, and title_en are required.`);
  }

  const locale = row.locale_primary?.trim() || 'zh';
  if (locale !== 'zh' && locale !== 'en') {
    throw new Error(`Row ${rowNumber}: locale_primary must be "zh" or "en".`);
  }

  const visibility = row.is_public?.trim().toLowerCase() || 'true';
  if (!['true', 'false', '1', '0'].includes(visibility)) {
    throw new Error(`Row ${rowNumber}: is_public must be true, false, 1, or 0.`);
  }

  return {
    slug,
    title_zh: titleZh,
    title_en: titleEn,
    description_zh: nullable(row.description_zh ?? ''),
    description_en: nullable(row.description_en ?? ''),
    instructions: nullable(row.instructions ?? ''),
    instructions_zh: nullable(row.instructions_zh ?? ''),
    instructions_en: nullable(row.instructions_en ?? ''),
    locale_primary: locale,
    cover_image: nullable(row.cover_image ?? ''),
    youtube_url: nullable(row.youtube_url ?? ''),
    prep_time_mins: numberOrNull(row.prep_time_mins ?? '', 'prep_time_mins', rowNumber),
    cook_time_mins: numberOrNull(row.cook_time_mins ?? '', 'cook_time_mins', rowNumber),
    servings: numberOrNull(row.servings ?? '', 'servings', rowNumber),
    tags: parseStringArray(row.tags_json ?? '[]', 'tags_json', rowNumber),
    is_public: visibility === 'true' || visibility === '1',
    shared_with: parseStringArray(row.shared_with_json ?? '[]', 'shared_with_json', rowNumber),
    ingredients: parseIngredients(row.ingredients_json ?? '[]', rowNumber),
  };
}

export function parseRecipeCsv(csv: string): CsvParseResult {
  const parsed = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: 'greedy',
  });
  const errors = parsed.errors.map((error) => `Row ${(error.row ?? 0) + 2}: ${error.message}`);

  const missingColumns = RECIPE_CSV_COLUMNS.filter(
    (column) => !parsed.meta.fields?.includes(column)
  );
  if (missingColumns.length) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}.`);
  }

  const items: RecipeImportItem[] = [];
  const seenSlugs = new Set<string>();
  parsed.data.forEach((row, index) => {
    try {
      const item = rowToRecipe(row, index + 2);
      if (seenSlugs.has(item.slug)) {
        throw new Error(`Row ${index + 2}: duplicate slug "${item.slug}" in this file.`);
      }
      seenSlugs.add(item.slug);
      items.push(item);
    } catch (error) {
      errors.push((error as Error).message);
    }
  });

  return { items, errors };
}

export function recipesToCsv(recipes: RecipeWithIngredients[]): string {
  const rows: CsvRecipeRow[] = recipes.map((recipe) => ({
    slug: recipe.slug,
    title_zh: recipe.title_zh,
    title_en: recipe.title_en,
    description_zh: recipe.description_zh ?? '',
    description_en: recipe.description_en ?? '',
    instructions: recipe.instructions,
    instructions_zh: recipe.instructions_zh ?? '',
    instructions_en: recipe.instructions_en ?? '',
    locale_primary: recipe.locale_primary,
    cover_image: recipe.cover_image ?? '',
    youtube_url: recipe.youtube_url ?? '',
    prep_time_mins: recipe.prep_time_mins?.toString() ?? '',
    cook_time_mins: recipe.cook_time_mins?.toString() ?? '',
    servings: recipe.servings?.toString() ?? '',
    tags_json: JSON.stringify(recipe.tags ?? []),
    is_public: recipe.is_public ? 'true' : 'false',
    shared_with_json: JSON.stringify((recipe.recipe_shares ?? []).map((share) => share.email)),
    ingredients_json: JSON.stringify(
      recipe.ingredients.map(({ name_zh, name_en, quantity, unit, sort_order }) => ({
        name_zh,
        name_en,
        quantity,
        unit,
        sort_order,
      }))
    ),
  }));

  return `\uFEFF${Papa.unparse(rows, {
    columns: [...RECIPE_CSV_COLUMNS],
    escapeFormulae: true,
  })}`;
}
