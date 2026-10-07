#!/usr/bin/env python3
"""Build src/assets/js/foods-data.js from USDA FoodData Central (SR Legacy, 2018-04).

Used by build-a-day.html and foods.html. To add a food: find its fdc_id in the SR Legacy
food.csv, add a row to FOODS below, and rerun:

    python3 bin/build_foods.py

The dataset (~6 MB zip) is downloaded once into bin/.usda-cache/ (gitignore it).
Nutrients USDA doesn't report for a food are listed in its "nd" field and shown as "no data".
"""
import csv, io, json, os, sys, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, '.usda-cache')
ZIP_URL = 'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_csv_2018-04.zip'
OUT = os.path.join(HERE, '..', 'src', 'assets', 'js', 'foods-data.js')

# our key -> USDA nutrient id
N = {'kcal': 1008, 'prot': 1003, 'ca': 1087, 'fe': 1089, 'mg': 1090, 'p': 1091, 'k': 1092,
     'na': 1093, 'zn': 1095, 'cu': 1098, 'se': 1103, 'a': 1106, 'e': 1109, 'd': 1114,
     'c': 1162, 'b1': 1165, 'b2': 1166, 'b3': 1167, 'b5': 1170, 'b6': 1175, 'b12': 1178,
     'k1': 1185, 'b9': 1190, 'gly': 1225, 'fat': 1004, 'alc': 1018}   # alc: ethyl alcohol, g

# Fatty acids: read raw USDA fields, then derive the keys the site uses (see derive_fats)
FA_RAW = {'_la_nc': 1316, '_la': 1269, '_ala_n3': 1404, '_ala': 1270, '_epa': 1278, '_dha': 1272,
          '_dpa': 1280, '_aa_n6': 1406, '_aa': 1271}
FA_KEYS = ['la', 'ala', 'epadha', 'o6', 'o3']   # g, g, mg, g, g
KEYS = list(N) + FA_KEYS
ANIMAL_CATS = {'Meat', 'Organ meats', 'Seafood', 'Eggs & dairy'}

# fdc_id, display name, grams per serving, serving label, category, flag
# flag: 'plant' (non-heme iron), 'carotene' (vitamin A as beta-carotene),
#       'fortified', 'est' (some values estimated; see estimates()). Label foods get 'label'.
FOODS = [
('172187','Eggs, scrambled',183,'3 large','Eggs & dairy',''),
('173410','Butter, salted',14,'1 tbsp','Eggs & dairy',''),
('171265','Whole milk',244,'1 cup','Eggs & dairy',''),
('171304','Greek yogurt, whole milk',170,'¾ cup','Eggs & dairy',''),
('173414','Cheddar cheese',28,'1 oz','Eggs & dairy',''),
('170848','Parmesan',20,'¾ oz','Eggs & dairy',''),
('173418','Cream cheese',29,'2 tbsp','Eggs & dairy',''),
('169457','Sirloin steak',113,'4 oz cooked','Meat',''),
('174034','Ground beef, 85% lean',113,'4 oz cooked','Meat',''),
('172388','Chicken thigh',113,'4 oz cooked','Meat',''),
('171477','Chicken breast',113,'4 oz cooked','Meat',''),
('167914','Bacon',24,'3 slices','Meat',''),
('169599','Gelatin / collagen powder',10,'1 tbsp','Meat',''),
('168627','Beef liver',113,'4 oz cooked','Organ meats',''),
('174491','Chicken liver',113,'4 oz cooked','Organ meats',''),
('169448','Beef heart',113,'4 oz cooked','Organ meats',''),
('175139','Sardines, canned in oil',92,'1 can','Seafood',''),
('173719','Coho salmon, wild',113,'4 oz cooked','Seafood',''),
('173692','Sockeye salmon',113,'4 oz cooked','Seafood',''),
('171980','Oysters, wild',84,'6 medium','Seafood',''),
('171994','Mackerel',113,'4 oz cooked','Seafood',''),
('171956','Atlantic cod',113,'4 oz cooked','Seafood',''),
('171971','Shrimp',113,'4 oz cooked','Seafood',''),
('173709','Tuna, light, canned',142,'1 can','Seafood',''),
('174183','Anchovies',20,'5 fillets','Seafood',''),
('169387','Arugula',40,'2 cups','Vegetables',''),
('169146','Beets, cooked',170,'1 cup sliced','Vegetables',''),
('168463','Spinach, cooked',180,'1 cup','Vegetables','plant'),
('168421','Kale, raw',42,'2 cups','Vegetables',''),
('170407','Collards, cooked',190,'1 cup','Vegetables',''),
('169967','Broccoli, cooked',156,'1 cup','Vegetables',''),
('170108','Red bell pepper',119,'1 medium','Vegetables',''),
('170457','Tomato',123,'1 medium','Vegetables',''),
('170393','Carrot',61,'1 medium','Vegetables','carotene'),
('169251','Mushrooms, white',70,'1 cup','Vegetables',''),
('169279','Sauerkraut',71,'½ cup','Vegetables',''),
('171705','Avocado',100,'½ large','Vegetables',''),
('170093','Baked potato, with skin',173,'1 medium','Starches',''),
('168483','Sweet potato, baked',114,'1 medium','Starches','carotene'),
('168878','White rice',158,'1 cup cooked','Starches',''),
('173904','Oats',40,'½ cup dry','Starches',''),
('173735','Black beans',172,'1 cup cooked','Starches','plant'),
('174924','White bread',25,'1 slice','Starches',''),
('172688','Whole-wheat bread',32,'1 slice','Starches',''),
('169737','Pasta',140,'1 cup cooked','Starches',''),
('175049','Bagel',105,'1 medium','Starches',''),
('169098','Orange juice',248,'1 cup','Fruit',''),
('169917','Orange',140,'1 medium','Fruit',''),
('168153','Kiwi',138,'2 fruit','Fruit',''),
('173944','Banana',118,'1 medium','Fruit',''),
('171711','Blueberries',148,'1 cup','Fruit',''),
('167762','Strawberries',152,'1 cup','Fruit',''),
('171688','Apple',182,'1 medium','Fruit',''),
('169640','Honey',21,'1 tbsp','Treats & convenience',''),
('170273','Dark chocolate, 70–85%',28,'1 oz','Treats & convenience',''),
('167575','Vanilla ice cream',66,'½ cup','Treats & convenience',''),
('172990','Frosted flakes',39,'1 cup','Treats & convenience','fortified'),
('170694','Fast-food hamburger',97,'1 burger','Treats & convenience',''),
('169677','Potato chips',28,'1 oz bag','Treats & convenience',''),
('170317','Frozen cheese pizza',146,'2 slices','Treats & convenience',''),
('174852','Cola',368,'12 oz can','Treats & convenience',''),
('173468','Salt',1.5,'¼ tsp','Treats & convenience',''),
('172883','Bone broth',240,'1 cup','Meat','est'),
('167827','Pork chop',113,'4 oz cooked','Meat',''),
('172544','Lamb, ground',113,'4 oz cooked','Meat',''),
('171532','Turkey thigh',113,'4 oz cooked','Meat',''),
('171799','Ground beef, 80% lean',113,'4 oz cooked','Meat',''),
('172184','Egg yolks, raw',51,'3 yolks','Eggs & dairy',''),
('172179','Cottage cheese',210,'1 cup','Eggs & dairy',''),
('170904','Kefir, plain',243,'1 cup','Eggs & dairy',''),
('171257','Sour cream',24,'2 tbsp','Eggs & dairy',''),
('172197','Goat cheese, hard',28,'1 oz','Eggs & dairy',''),
('169450','Beef kidney',113,'4 oz cooked','Organ meats',''),
('170598','Beef tongue',113,'4 oz cooked','Organ meats',''),
('173870','Liverwurst',56,'2 oz','Organ meats',''),
('175117','Herring',113,'4 oz cooked','Seafood',''),
('175155','Rainbow trout, wild',113,'4 oz cooked','Seafood',''),
('174201','Halibut',113,'4 oz cooked','Seafood',''),
('174217','Mussels',113,'4 oz cooked','Seafood',''),
('171975','Clams',113,'4 oz cooked','Seafood',''),
('174239','Fish roe',28,'1 oz','Seafood',''),
('170401','Swiss chard, cooked',175,'1 cup','Vegetables',''),
('170376','Beet greens, cooked',144,'1 cup','Vegetables',''),
('169227','Dandelion greens, cooked',105,'1 cup','Vegetables',''),
('170416','Parsley',30,'½ cup','Vegetables',''),
('169971','Brussels sprouts, cooked',156,'1 cup','Vegetables',''),
('168390','Asparagus, cooked',180,'1 cup','Vegetables',''),
('170397','Cauliflower, cooked',124,'1 cup','Vegetables',''),
('169141','Green beans, cooked',125,'1 cup','Vegetables',''),
('169292','Zucchini, cooked',180,'1 cup','Vegetables',''),
('169976','Cabbage, cooked',150,'1 cup','Vegetables',''),
('171327','Onion powder',0.6,'¼ tsp','Vegetables',''),
('171325','Garlic powder',0.8,'¼ tsp','Vegetables',''),
('170438','Boiled potato, with skin',136,'1 medium','Starches',''),
('169296','Butternut squash, baked',205,'1 cup','Starches','carotene'),
('169910','Mango',165,'1 cup','Fruit',''),
('169124','Pineapple',165,'1 cup','Fruit',''),
('167765','Watermelon',280,'2 cups','Fruit',''),
('171719','Cherries',138,'1 cup','Fruit',''),
('167755','Raspberries',123,'1 cup','Fruit',''),
('173033','Grapefruit',230,'1 fruit','Fruit',''),
('169134','Pomegranate',174,'1 cup arils','Fruit',''),
('167747','Lemon juice',30,'2 tbsp','Fruit',''),
('169661','Maple syrup',20,'1 tbsp','Treats & convenience',''),
('170698','French fries, fast food',117,'1 medium','Treats & convenience',''),
('173321','Chicken tenders, fast food',96,'6 pieces','Treats & convenience',''),
('171009','Mayonnaise',14,'1 tbsp','Treats & convenience',''),
('173592','Ranch dressing',30,'2 tbsp','Treats & convenience',''),
# pho bowl (recipe-pho.html)
('168733','Flank steak',113,'4 oz cooked','Meat',''),
('168914','Rice noodles',176,'1 cup cooked','Starches',''),
('174531','Fish sauce',9,'1½ tsp','Treats & convenience',''),
('169957','Bean sprouts',52,'½ cup','Vegetables',''),
('170000','Onion, raw',40,'¼ cup sliced','Vegetables',''),
('168156','Lime juice',15,'1 tbsp','Fruit',''),
('169997','Cilantro',4,'¼ cup','Vegetables',''),
('172232','Basil, fresh',5,'¼ cup','Vegetables',''),
('168576','Jalapeño',14,'1 pepper','Vegetables',''),
# marinades (recipe-marinades.html)
('171788','Skirt steak',113,'4 oz cooked','Meat',''),
('173625','Chicken thigh, with skin',113,'4 oz cooked','Meat',''),
('171450','Roast chicken, with skin',113,'4 oz cooked','Meat',''),
# soup, tenderloin, weeknight dinners
('171811','Beef tenderloin',113,'4 oz cooked','Meat',''),   # lean only: trimmed, as cooked whole
('169988','Celery',101,'1 cup chopped','Vegetables',''),
('168437','Shiitake mushrooms, cooked',73,'½ cup','Vegetables',''),
('170005','Green onions',25,'¼ cup','Vegetables',''),
('172026','Brown rice pasta',140,'1 cup cooked','Starches',''),
('169732','Egg noodles',160,'1 cup cooked','Starches',''),
# seafood chowder bowl, slow-cooker carnitas
('173694','Black sea bass',113,'4 oz cooked','Seafood',''),
('167742','Scallops',85,'3 oz cooked','Seafood',''),
('174062','Clam chowder, New England (canned)',244,'1 cup','Treats & convenience',''),
('167854','Pork spareribs, braised',113,'4 oz cooked','Meat',''),   # stands in for pork brisket
('168256','Pork shoulder, braised',113,'4 oz cooked','Meat',''),
('175036','Corn tortillas',52,'2 tortillas','Starches',''),
# date night: ribeye, short ribs
('173390','Ribeye steak',113,'4 oz cooked','Meat',''),
('171222','Short ribs, braised',113,'4 oz cooked','Meat',''),
]

# Cooking ingredients used by the recipe pages (recipe-*.html). Same shape and processing as FOODS,
# but written to window.INGREDIENTS so they stay out of Build a Day and the Food Database.
# Recipe pages look ids up in FOODS and INGREDIENTS together. g/p = a typical measure, for reference.
INGREDIENTS = [
('172234','Mustard',15,'1 tbsp','Ingredients',''),     # stands in for stone-ground and dijon
('173469','Apple cider vinegar',15,'1 tbsp','Ingredients',''),
('172240','Red wine vinegar',15,'1 tbsp','Ingredients',''),
('172237','Vinegar, distilled',15,'1 tbsp','Ingredients',''),   # stands in for rice vinegar
('171413','Olive oil',13.5,'1 tbsp','Ingredients',''),
('173573','Avocado oil',13.6,'1 tbsp','Ingredients',''),
('169230','Garlic',3,'1 clove','Ingredients',''),
('169231','Ginger root',6,'1 tbsp grated','Ingredients',''),
('170931','Black pepper',2.3,'1 tsp','Ingredients',''),
('171329','Paprika',2.3,'1 tsp','Ingredients',''),
('170932','Cayenne / red pepper flakes',1.8,'1 tsp','Ingredients',''),
('171319','Chili powder',8,'1 tbsp','Ingredients',''),
('170923','Cumin',2.1,'1 tsp','Ingredients',''),
('171328','Oregano, dried',1,'1 tsp','Ingredients',''),
('170107','Chili peppers, canned',15,'1 tbsp','Ingredients',''),  # stands in for chipotles in adobo
('169655','Sugar',4.2,'1 tsp','Ingredients',''),
('168833','Brown sugar',4.6,'1 tsp','Ingredients',''),
('167749','Lemon zest',2,'1 tsp','Ingredients',''),
('174277','Soy sauce',16,'1 tbsp','Ingredients',''),
('168556','Ketchup',17,'1 tbsp','Ingredients',''),
('171186','Sriracha',6,'1 tsp','Ingredients',''),
('172233','Dill, fresh',1,'1 tbsp','Ingredients',''),
('173473','Rosemary, fresh',1.7,'1 tbsp','Ingredients',''),
('173470','Thyme, fresh',0.8,'1 tsp','Ingredients',''),
('171400','Beef tallow',13,'1 tbsp','Ingredients',''),
('173412','Ghee',13,'1 tbsp','Ingredients',''),
('173472','Horseradish, prepared',15,'1 tbsp','Ingredients',''),
('169994','Chives',3,'1 tbsp','Ingredients',''),
('170459','Tomato paste',16,'1 tbsp','Ingredients',''),
('168561','Sweet relish',15,'1 tbsp','Ingredients',''),
('169698','Cornstarch',8,'1 tbsp','Ingredients',''),
('171016','Sesame oil',4.5,'1 tsp','Ingredients',''),
('170150','Sesame seeds',9,'1 tbsp','Ingredients',''),
('171192','Marinara sauce',125,'½ cup','Ingredients',''),   # stands in for jarred seafood tomato sauces
('174837','White wine',118,'½ cup','Ingredients',''),
('173190','Red wine',118,'½ cup','Ingredients',''),
('170499','Shallot',10,'1 tbsp minced','Ingredients',''),
('170859','Heavy cream',15,'1 tbsp','Ingredients',''),
# desserts and drinks
('173471','Vanilla extract',4.2,'1 tsp','Ingredients',''),
('172183','Egg white, raw',33,'1 large','Ingredients',''),
('171891','Espresso',30,'1 shot','Ingredients',''),
('174815','Spirits, 80 proof',42,'1½ oz','Ingredients',''),   # tequila, vodka, gin, rum, whiskey
('170277','Agave syrup',21,'1 tbsp','Ingredients',''),
('173039','Grapefruit juice',62,'2 oz','Ingredients',''),
('174842','Club soda',118,'4 oz','Ingredients',''),
]

# Ingredients USDA doesn't have, as weighted mixes of SR foods (same format as RECIPES).
# Output goes to INGREDIENTS. All values are estimates.
INGREDIENT_MIXES = [
    dict(id='mix-avocado-mayo', n='Avocado oil mayo', g=14, p='1 tbsp', c='Ingredients', f='est',
         parts={'173573': 79, '172184': 8, '172237': 10, '173468': 1.5},
         src='Estimate: avocado oil 79%, egg yolk 8%, vinegar 10%, salt 1.5% (typical avocado-oil mayo).'),
    dict(id='mix-mirin', n='Mirin', g=18, p='1 tbsp', c='Ingredients', f='est',
         parts={'167723': 55, '169655': 40},
         src='Estimate: sake 55%, sugar 40% (mirin is a sweet rice wine, ~40% sugar).'),
    dict(id='mix-gochujang', n='Gochujang', g=17, p='1 tbsp', c='Ingredients', f='est',
         parts={'169655': 35, '174277': 30, '170932': 10, '169698': 10},
         src='Estimate: sugar 35%, soy sauce 30%, cayenne 10%, cornstarch 10% (fermented chili paste; '
             'USDA has no entry).'),
]


# Foods USDA doesn't have, built as a weighted mix of SR ingredients.
# parts: {fdc_id: grams per 100 g of the finished food}
RECIPES = [
    dict(id='rcp-guacamole', n='Guacamole', g=60, p='¼ cup', c='Vegetables', f='est',
         parts={'171705': 84.5, '170457': 7, '171327': 0.5, '168156': 5, '169997': 2.5, '173468': 0.5},
         src='Recipe estimate from USDA SR ingredients: avocado 85%, tomato 7%, lime juice 5%, '
             'cilantro 2.5%, onion powder 0.5%, salt 0.5%.'),
]

# Branded products, from the manufacturer's nutrition label (values PER SERVING as printed).
# Everything the label doesn't print is estimated from `model`: the product's ingredient list as
# USDA SR foods, {fdc_id: grams per 100 g}. The model is scaled so its protein matches the label
# (and its fatty acids so its fat matches, when the label gives fat). Label values always win.
# zero = the label says "not a significant source" / 0 g. est = hand estimates (per serving).
# All model-filled and est values are marked "~" on the site.
LABEL_FOODS = [
    dict(id='lbl-cinnamon-sourdough', n='Cinnamon sourdough (Bread of Heaven)', g=40, p='1 slice',
         c='Starches', url='https://ovenfreshdelivery.com/collections/all-products/products/cinnamon-sourdough/',
         label={'kcal': 100, 'prot': 2, 'na': 130, 'fat': 0}, zero=['ca', 'fe', 'k', 'd', 'la', 'ala', 'epadha', 'o6', 'o3'],
         # organic unbleached (unenriched) flour, cane sugar, cinnamon, salt; the rest is water
         model={'169761': 58, '169655': 6, '171320': 1, '173468': 1}),
    dict(id='lbl-a2-milk', n='A2 whole milk, organic (Family Farmstead)', g=227, p='1 cup',
         c='Eggs & dairy', url='https://world.openfoodfacts.org/product/0860002348148',
         label={'kcal': 170, 'prot': 9, 'fat': 10, 'na': 110, 'ca': 330, 'k': 360}, zero=['d', 'fe'],
         model={'172217': 100}),  # whole milk without added vitamins A and D
    dict(id='lbl-deer-organ-bites', n='Venison & organ jerky bites (Real Provisions)', g=28, p='1 oz',
         c='Brand products', url='https://realprovisions.com/products/wild-axis-deer-and-organ-jerky-bites',
         label={'a': 681, 'b12': 4.86, 'b2': 0.267, 'b3': 1.99, 'b1': 0.087, 'se': 10.1, 'cu': 0.751, 'p': 72.5},
         # no macro panel published: protein from "21 g per 1.5 oz", kcal from lean dried venison,
         # sodium typical of salted jerky
         est={'prot': 14, 'kcal': 68, 'na': 520},
         model={'175085': 100}),  # venison, roasted
    dict(id='lbl-wild-river-bites', n='Wild River Bites, carp (Real Provisions)', g=42.5, p='1 pack',
         c='Brand products', url='https://realprovisions.com/products/wild-river-bites',
         label={'kcal': 140, 'prot': 21, 'fat': 3, 'na': 1780, 'd': 64, 'ca': 24, 'fe': 2, 'k': 415},
         model={'174185': 100}),  # carp, cooked; omega-3s scale with the label's 3 g fat
    dict(id='lbl-abc-chocolate', n='Animal-Based Complete protein, chocolate (Lineage)', g=46.7, p='1 scoop',
         c='Brand products', url='https://lineageprovisions.com/products/animal-based-complete-whey-protein-chocolate',
         label={'kcal': 170, 'prot': 20, 'fat': 1.5, 'b2': 0.2, 'b6': 0.1, 'ca': 420, 'fe': 2.1, 'p': 280, 'mg': 45,
                'zn': 1.5, 'na': 135, 'k': 380},
         # milk + whey protein concentrate (as unfortified dry milk), coconut sugar, cocoa, and the
         # 0.8 g organ blend (heart, liver, kidney, spleen, pancreas: about a fifth liver)
         model={'170877': 65, '169655': 26, '169593': 7, '168627': 0.35, '169448': 1.35}),
    dict(id='lbl-nose-to-tail-collagen', n='Nose-to-Tail Collagen (Lineage)', g=17.6, p='1 scoop',
         c='Brand products', url='https://lineageprovisions.com/products/nose-to-tail-collagen',
         label={'kcal': 60, 'prot': 15, 'fat': 0, 'c': 100, 'ca': 30, 'fe': 0.6, 'na': 135},
         zero=['la', 'ala', 'epadha', 'o6', 'o3'],
         model={'169599': 100}),  # gelatin (glycine is ~22% of collagen protein)
    dict(id='lbl-sport-drink', n='Sport Drink electrolyte mix', g=15, p='1 tbsp',
         c='Brand products', url='https://sport-drink.com/collections/sport-drink',
         label={'kcal': 40, 'prot': 0, 'fat': 0, 'na': 480, 'ca': 140, 'k': 520, 'mg': 50},
         zero=['la', 'ala', 'epadha', 'o6', 'o3', 'gly'],
         model={'169655': 60, '168156': 5}),  # cane sugar + lime; the rest is added electrolytes
    dict(id='lbl-tl-pb-bar', n='Protein bar, PB choc chip (Transparent Labs)', g=60, p='1 bar',
         c='Brand products', url='https://www.transparentlabs.com/products/protein-bars',
         label={'kcal': 280, 'prot': 15, 'fat': 16, 'na': 280, 'ca': 30, 'fe': 0.5, 'k': 110, 'd': 0},
         # peanut butter, chocolate chips, whey isolate (as unfortified dry milk), dates, tapioca syrup, honey, egg white, oats, coconut oil, salt
         model={'172470': 30, '170273': 13, '170877': 15, '168191': 13, '169717': 10, '169640': 5,
                '172204': 4, '173904': 7, '171412': 2, '173468': 0.5}),
    dict(id='lbl-equip-prime-berry', n='Prime Bar, berry (Equip)', g=61, p='1 bar',
         c='Brand products', url='https://world.openfoodfacts.org/product/0850020087372/prime-bar-equip',
         label={'kcal': 240, 'prot': 20, 'fat': 9, 'na': 130, 'ca': 30, 'fe': 0.2, 'k': 180, 'd': 0},
         # beef protein isolate + collagen (as gelatin), colostrum (as dry milk), dates, honey,
         # cocoa butter, dried berries, beef tallow
         model={'169599': 32, '170877': 2, '168191': 30, '169640': 16, '171421': 10, '168158': 5, '171400': 5}),
]

# USDA foods with a few blank nutrients: borrow them from the closest SR entry.
# scale 'prot' = adjust by the protein ratio (e.g. raw shellfish standing in for cooked).
PROXIES = {
    '167914': ('168321', None),    # bacon, baked <- bacon, microwaved
    '174491': ('171061', None),    # chicken liver, pan-fried <- simmered
    '175049': ('174924', None),    # bagel <- white bread
    '170273': ('170272', None),    # dark chocolate 70-85% <- 60-69%
    '172883': ('172884', None),    # bone broth <- chicken stock
    '173870': ('171621', None),    # liverwurst <- braunschweiger
    '175155': ('173718', None),    # wild rainbow trout <- farmed rainbow trout
    '174217': ('174216', 'prot'),  # mussels, cooked <- raw
    '171975': ('174214', 'prot'),  # clams, cooked <- raw
    '174239': ('175132', 'prot'),  # fish roe, cooked <- raw
    '174062': ('174539', 'prot'),  # clam chowder, ready-to-serve <- prepared with 2% milk
}


def estimates(food):
    """Hand-adjusted values for foods USDA covers poorly. Returns the list of estimated keys."""
    if food['n'] == 'Bone broth':
        # SR only has home-prepared beef stock (2 g protein/100 g, no glycine). Keep its
        # micronutrients; set protein to the median commercial bone broth in FDC Branded
        # (4.17 g/100 g); glycine = 22.3% of protein, the ratio in SR gelatin (fdc 169599).
        v = food['v']
        v['kcal'] = round(v['kcal'] + (4.17 - v['prot']) * 4, 1)
        v['prot'] = 4.17
        v['gly'] = round(4.17 * 0.223, 3)
        food['src'] = ('Micronutrients: Soup, stock, beef, home-prepared (fdc 172883). Protein: median '
                       'commercial bone broth (FDC Branded). Glycine: estimated at 22% of protein.')
        return ['kcal', 'prot', 'gly']
    return []


def derive_fats(v, animal):
    """Omega-6 / omega-3 keys from raw USDA fatty acids (g per 100 g).

    la     linoleic acid, 18:2 n-6 (falls back to undifferentiated 18:2)
    ala    alpha-linolenic acid, 18:3 n-3 (falls back to undifferentiated 18:3)
    epadha EPA + DHA in mg. SR often leaves these blank for plant foods, which have none, so a
           blank counts as 0 for non-animal foods and as no data for animal foods.
    o6/o3  totals for the ratio: LA + arachidonic acid, and ALA + EPA + DHA + DPA
    """
    la = v.get('_la_nc', v.get('_la'))
    ala = v.get('_ala_n3', v.get('_ala'))
    aa = v.get('_aa_n6', v.get('_aa', 0.0))
    epa, dha, dpa = v.get('_epa'), v.get('_dha'), v.get('_dpa', 0.0)
    if la is not None:
        v['la'] = la
        v['o6'] = la + aa
    if ala is not None:
        v['ala'] = ala
    if epa is None and dha is None and not animal:
        epa = dha = 0.0
    if epa is not None or dha is not None:
        v['epadha'] = ((epa or 0) + (dha or 0)) * 1000
        if ala is not None:
            v['o3'] = ala + (epa or 0) + (dha or 0) + dpa
    for k in FA_RAW:
        v.pop(k, None)


def fill_gaps(out, val, desc):
    """Estimate every nutrient USDA left blank, and mark it as estimated.

    1. PROXIES: borrow from the closest SR entry.
    2. Glycine: protein x the median glycine:protein ratio of foods in the same category.
    3. Anything still blank: 0 (these are all nutrients the food has little or none of).
    """
    ratios = {}
    for f in out:
        v = f['v']
        if 'gly' in v and v.get('prot', 0) > 1 and 'gly' not in f.get('est', []):
            ratios.setdefault(f['c'], []).append(v['gly'] / v['prot'])
    med = lambda xs: sorted(xs)[len(xs) // 2]
    all_ratio = med([r for rs in ratios.values() for r in rs])
    for f in out:
        missing = [k for k in KEYS if k not in f['v']]
        if not missing:
            continue
        v, est = f['v'], set(f.get('est', []))
        if f['id'] in PROXIES:
            pid, scale = PROXIES[f['id']]
            pv = val[pid]
            fac = v.get('prot', 0) / pv['prot'] if scale == 'prot' and pv.get('prot') else 1
            for k in missing:
                if k in pv:
                    v[k] = round(pv[k] * fac, 4)
                    est.add(k)
            f['src'] += f'; blanks filled from "{desc[pid]}"'
        if 'gly' not in v and 'prot' in v:
            v['gly'] = round(v['prot'] * med(ratios.get(f['c'], [all_ratio])), 4)
            est.add('gly')
        for k in KEYS:
            if k not in v:
                v[k] = 0.0
                est.add(k)
        f['est'] = sorted(est)
        f.pop('nd', None)


def load_zip():
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, 'sr_legacy.zip')
    if not os.path.exists(path):
        print('downloading SR Legacy…', file=sys.stderr)
        urllib.request.urlretrieve(ZIP_URL, path)
    return zipfile.ZipFile(path)


def rows(z, name):
    member = next(m for m in z.namelist() if m.endswith('/' + name))
    return csv.DictReader(io.TextIOWrapper(z.open(member), encoding='utf-8'))


def main():
    z = load_zip()
    ids = {f[0] for f in FOODS}
    assert len(ids) == len(FOODS), 'duplicate fdc_id in FOODS'
    assert not ids & {f[0] for f in INGREDIENTS}, 'fdc_id in both FOODS and INGREDIENTS'
    ids |= {f[0] for f in INGREDIENTS}
    ids |= {i for r in RECIPES + INGREDIENT_MIXES for i in r['parts']} | {i for l in LABEL_FOODS for i in l.get('model', {})}
    ids |= {p for p, _ in PROXIES.values()}
    desc = {r['fdc_id']: r['description'] for r in rows(z, 'food.csv') if r['fdc_id'] in ids}
    missing_ids = ids - desc.keys()
    assert not missing_ids, f'unknown fdc_id: {missing_ids}'
    inv = {v: k for k, v in {**N, **FA_RAW}.items()}
    val = {i: {} for i in ids}
    for r in rows(z, 'food_nutrient.csv'):
        if r['fdc_id'] in ids and int(r['nutrient_id']) in inv:
            val[r['fdc_id']][inv[int(r['nutrient_id'])]] = float(r['amount'])
    cat = {f[0]: f[4] for f in FOODS}
    for i in ids:
        derive_fats(val[i], cat.get(i) in ANIMAL_CATS)

    out = []
    for fid, name, grams, portion, cat, flag in FOODS + INGREDIENTS:
        v = val[fid]
        food = {'id': fid, 'n': name, 'g': grams, 'p': portion, 'c': cat, 'f': flag,
                'src': desc[fid], 'v': {k: round(v[k], 4) for k in KEYS if k in v}}
        est = estimates(food)
        if est:
            food['est'] = est
        nd = [k for k in KEYS if k not in food['v']]
        if nd:
            food['nd'] = nd
        out.append(food)

    for r in RECIPES + INGREDIENT_MIXES:
        v = {}
        for k in KEYS:
            if all(k in val[i] for i in r['parts']):
                v[k] = round(sum(val[i][k] * grams / 100 for i, grams in r['parts'].items()), 4)
        food = {'id': r['id'], 'n': r['n'], 'g': r['g'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'src': r['src'], 'v': v}
        nd = [k for k in KEYS if k not in v]
        if nd:
            food['nd'] = nd
        out.append(food)

    for l in LABEL_FOODS:
        per100 = lambda x: x * 100 / l['g']
        label = {k: per100(x) for k, x in l['label'].items()}
        # ingredient model, scaled to the label's protein (fatty acids to the label's fat)
        model = {k: sum(val[i].get(k, 0) * grams / 100 for i, grams in l['model'].items()) for k in KEYS}
        prot = label.get('prot', per100(l.get('est', {}).get('prot', 0)))
        fp = prot / model['prot'] if model['prot'] > 0.5 else 1
        ff = label['fat'] / model['fat'] if 'fat' in label and model['fat'] > 0.1 else fp
        v = {k: x * (ff if k in FA_KEYS or k == 'fat' else fp) for k, x in model.items()}
        est = set(v) - set(label) - set(l.get('zero', []))
        v.update(label)
        v.update({k: 0.0 for k in l.get('zero', [])})
        v.update({k: per100(x) for k, x in l.get('est', {}).items()})
        est |= set(l.get('est', {}))
        food = {'id': l['id'], 'n': l['n'], 'g': l['g'], 'p': l['p'], 'c': l['c'], 'f': 'label',
                'src': 'Manufacturer nutrition label; nutrients not on the label estimated from the ingredients '
                       '(' + '; '.join(f"{desc[i]} {g}%" for i, g in l['model'].items()) + ')',
                'url': l['url'], 'v': {k: round(x, 4) for k, x in v.items() if k in KEYS}}
        food['est'] = sorted(est - {'fat'})
        out.append(food)

    fill_gaps(out, val, desc)

    assert len({f['id'] for f in out}) == len(out) and len({f['n'] for f in out}) == len(out), 'duplicate id/name'
    ing_ids = {f[0] for f in INGREDIENTS} | {r['id'] for r in INGREDIENT_MIXES}
    ingredients = [f for f in out if f['id'] in ing_ids]
    out = [f for f in out if f['id'] not in ing_ids]

    with open(OUT, 'w') as fh:
        fh.write('// Generated by bin/build_foods.py from USDA FoodData Central SR Legacy (2018-04).\n')
        fh.write('// Values are per 100 g. Do not edit by hand; edit FOODS in the script and rerun.\n')
        fh.write('window.FOODS = ')
        json.dump(out, fh, separators=(',', ':'), ensure_ascii=False)
        fh.write(';\n// Recipe ingredients (recipe-*.html only; not listed in Build a Day or the Food Database).\n')
        fh.write('window.INGREDIENTS = ')
        json.dump(ingredients, fh, separators=(',', ':'), ensure_ascii=False)
        fh.write(';\n')
    print(f'wrote {len(out)} foods + {len(ingredients)} ingredients to {os.path.relpath(OUT)}')


if __name__ == '__main__':
    main()
