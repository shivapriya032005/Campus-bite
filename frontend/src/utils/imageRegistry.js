/**
 * CampusBite Image Registry
 * Centralized mapping for categories, restaurants, dishes, banners, and fallbacks.
 */

export const CATEGORY_IMAGES = {
  biryani: '/assets/categories/biryani.jpg',
  pizza: '/assets/categories/pizza.jpg',
  burgers: '/assets/categories/burgers.jpg',
  chinese: '/assets/categories/chinese.jpg',
  'south indian': '/assets/categories/south-indian.jpg',
  'north indian': '/assets/categories/north-indian.jpg',
  desserts: '/assets/categories/desserts.jpg',
  beverages: '/assets/categories/beverages.jpg',
  'healthy food': '/assets/categories/healthy.jpg',
  healthy: '/assets/categories/healthy.jpg',
  snacks: '/assets/categories/snacks.jpg',
};

export const PROMO_BANNERS = [
  {
    id: 'campus-favs',
    title: 'Campus Favourites',
    subtitle: 'Top-rated culinary spots voted by fellow students',
    tag: 'Trending on Campus',
    ctaText: 'Explore Top Rated',
    ctaQuery: 'Bistro',
    image: '/assets/banners/banner-campus-favs.jpg',
    accentColor: '#C5A46D',
  },
  {
    id: 'biryani-fest',
    title: 'Dum Biryani Specials',
    subtitle: 'Slow-cooked royal pots, aromatic basmati & cooling raita',
    tag: 'Chef Signature',
    ctaText: 'View Biryani Hub',
    ctaQuery: 'Biryani',
    image: '/assets/banners/banner-biryani-fest.jpg',
    accentColor: '#E67E22',
  },
  {
    id: 'healthy-fuel',
    title: 'Wholesome Green Fuel',
    subtitle: 'Mediterranean grain bowls, avocado toast & fresh juices',
    tag: 'Nutritious & Fresh',
    ctaText: 'Healthy Picks',
    ctaQuery: 'Healthy',
    image: '/assets/banners/banner-healthy-eats.jpg',
    accentColor: '#248A62',
  },
  {
    id: 'late-night',
    title: 'Late Night Study Fuel',
    subtitle: 'Hot burgers, crispy fries & caffeine delivered to dorms',
    tag: 'Open Till Midnight',
    ctaText: 'Night Owl Menu',
    ctaQuery: 'Pizza',
    image: '/assets/banners/banner-late-night.jpg',
    accentColor: '#E74C3C',
  },
];

export const PLACEHOLDERS = {
  food: '/assets/placeholders/food-placeholder.jpg',
  restaurant: '/assets/placeholders/restaurant-placeholder.jpg',
};

/**
 * Returns a guaranteed valid image URL for a dish, falling back to local asset or placeholder.
 */
export function getDishImage(item) {
  if (item?.image_url && item.image_url.trim().length > 0) {
    return item.image_url;
  }
  const name = (item?.name || '').toLowerCase();
  if (name.includes('burger')) return '/assets/dishes/truffle-burger.jpg';
  if (name.includes('chicken') && name.includes('sandwich')) return '/assets/dishes/crispy-chicken.jpg';
  if (name.includes('fries')) return '/assets/dishes/sweet-potato-fries.jpg';
  if (name.includes('coffee') || name.includes('brew')) return '/assets/dishes/cold-brew.jpg';
  if (name.includes('margherita')) return '/assets/dishes/margherita-pizza.jpg';
  if (name.includes('pepperoni')) return '/assets/dishes/pepperoni-pizza.jpg';
  if (name.includes('garlic bread')) return '/assets/dishes/garlic-bread.jpg';
  if (name.includes('biryani')) return '/assets/dishes/hyderabadi-biryani.jpg';
  if (name.includes('dosa')) return '/assets/dishes/masala-dosa.jpg';
  if (name.includes('vada') || name.includes('idli')) return '/assets/dishes/medu-vada.jpg';
  if (name.includes('noodle')) return '/assets/dishes/hakka-noodles.jpg';
  if (name.includes('dim sum') || name.includes('dumpling')) return '/assets/dishes/dim-sum.jpg';
  if (name.includes('butter chicken')) return '/assets/dishes/butter-chicken.jpg';
  if (name.includes('tikka') || name.includes('paneer')) return '/assets/dishes/paneer-tikka.jpg';
  if (name.includes('naan')) return '/assets/dishes/garlic-naan.jpg';
  if (name.includes('cake') || name.includes('choco')) return '/assets/dishes/choco-lava.jpg';
  if (name.includes('waffle')) return '/assets/dishes/belgian-waffle.jpg';
  if (name.includes('bowl')) return '/assets/dishes/acai-bowl.jpg';
  if (name.includes('toast') || name.includes('avocado')) return '/assets/dishes/avocado-toast.jpg';

  return PLACEHOLDERS.food;
}

/**
 * Returns a guaranteed valid image URL for a restaurant.
 */
export function getRestaurantImage(restaurant) {
  if (restaurant?.image_url && restaurant.image_url.trim().length > 0) {
    return restaurant.image_url;
  }
  const name = (restaurant?.name || '').toLowerCase();
  const cuisine = (restaurant?.cuisine_type || '').toLowerCase();

  if (name.includes('bistro') || cuisine.includes('american')) return '/assets/restaurants/bistro.jpg';
  if (name.includes('pizza') || cuisine.includes('italian')) return '/assets/restaurants/pizza-hub.jpg';
  if (name.includes('biryani')) return '/assets/restaurants/biryani-house.jpg';
  if (name.includes('dosa') || cuisine.includes('south indian')) return '/assets/restaurants/dosa-corner.jpg';
  if (name.includes('wok') || cuisine.includes('chinese') || cuisine.includes('asian')) return '/assets/restaurants/wok-box.jpg';
  if (name.includes('dhaba') || cuisine.includes('north indian')) return '/assets/restaurants/punjab-dhaba.jpg';
  if (name.includes('sweet') || cuisine.includes('dessert')) return '/assets/restaurants/sweet-treats.jpg';
  if (name.includes('green') || cuisine.includes('healthy')) return '/assets/restaurants/green-fuel.jpg';

  return PLACEHOLDERS.restaurant;
}

