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
      restaurants: {
        Row: Restaurant;
        Insert: Omit<Restaurant, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Restaurant, 'id' | 'created_at'>>;
      };
      restaurant_dishes: {
        Row: RestaurantDish;
        Insert: Omit<RestaurantDish, 'id'>;
        Update: Partial<Omit<RestaurantDish, 'id'>>;
      };
      restaurant_photos: {
        Row: RestaurantPhoto;
        Insert: Omit<RestaurantPhoto, 'id'>;
        Update: Partial<Omit<RestaurantPhoto, 'id'>>;
      };
      recipe_shares: {
        Row: RecipeShare;
        Insert: Omit<RecipeShare, 'id' | 'created_at'>;
        Update: Partial<Omit<RecipeShare, 'id' | 'created_at'>>;
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
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type RecipeShare = {
  id: string;
  recipe_id: string;
  email: string;
  created_at: string;
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
  is_public?: boolean;
  shared_with?: string[];
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
  recipe_shares?: Pick<RecipeShare, 'email'>[];
};

export type Restaurant = {
  id: string;
  name: string;
  name_zh: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  cuisine: string | null;
  tags: string[];
  lat: number | null;
  lng: number | null;
  google_maps_url: string | null;
  overall_rating: number | null;
  price_level: number | null;
  visited_at: string | null;
  notes: string | null;
  cover_image: string | null;
  created_at: string;
  updated_at: string;
};

export type RestaurantDish = {
  id: string;
  restaurant_id: string;
  name: string;
  name_zh: string | null;
  description: string | null;
  image_url: string | null;
  rating: number | null;
  recommended: boolean;
  sort_order: number;
};

export type RestaurantPhoto = {
  id: string;
  restaurant_id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
};

export type RestaurantWithDetails = Restaurant & {
  restaurant_dishes: RestaurantDish[];
  restaurant_photos: RestaurantPhoto[];
};
