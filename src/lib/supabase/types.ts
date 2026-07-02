export type Database = {
  public: {
    Tables: {
      recipes: {
        Row: Recipe;
        Insert: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Recipe, 'id' | 'created_at'>>;
      };
      ingredients: {
        Row: Ingredient;
        Insert: Omit<Ingredient, 'id'>;
        Update: Partial<Omit<Ingredient, 'id'>>;
      };
      meal_plans: {
        Row: MealPlan;
        Insert: Omit<MealPlan, 'id' | 'created_at'>;
        Update: Partial<Omit<MealPlan, 'id' | 'created_at'>>;
      };
    };
  };
};

export type Recipe = {
  id: string;
  slug: string;
  title_zh: string;
  title_en: string;
  description_zh: string | null;
  description_en: string | null;
  instructions: string;
  instructions_zh: string | null;
  instructions_en: string | null;
  locale_primary: 'zh' | 'en';
  cover_image: string | null;
  youtube_url: string | null;
  prep_time_mins: number | null;
  cook_time_mins: number | null;
  servings: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
};

export type RecipeImportItem = {
  slug: string;
  title_zh: string;
  title_en: string;
  description_zh?: string | null;
  description_en?: string | null;
  instructions_zh?: string | null;
  instructions_en?: string | null;
  locale_primary?: 'zh' | 'en';
  cover_image?: string | null;
  youtube_url?: string | null;
  prep_time_mins?: number | null;
  cook_time_mins?: number | null;
  servings?: number | null;
  tags?: string[];
  ingredients: Array<{
    name_zh: string;
    name_en: string;
    quantity: string;
    unit: string;
    sort_order?: number;
  }>;
};

export type Ingredient = {
  id: string;
  recipe_id: string;
  name_zh: string;
  name_en: string;
  quantity: string;
  unit: string;
  sort_order: number;
};

export type MealPlan = {
  id: string;
  user_id: string;
  recipe_id: string;
  planned_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes: string | null;
  created_at: string;
};

export type RecipeWithIngredients = Recipe & {
  ingredients: Ingredient[];
};
