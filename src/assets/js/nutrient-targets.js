// Shared by build-a-day.html and foods.html. Food values live in foods-data.js.
// Targets: US RDA, or AI where no RDA exists, adults 19–50 (magnesium uses the 31+ figure).
// UL: tolerable upper intake level, flagged only where food alone can plausibly exceed it.
// Fields: key, label, unit, target [men, women], page, group, UL, short label, kind
// kind: undefined = a target to reach; 'info' = shown, but not a target; 'limit' = a ceiling,
// measured as % of calories (linoleic acid: see linoleic-acid.html, ~1–2% of calories is enough).
window.NUTRIENTS = [
  ['ca','Calcium','mg',[1000,1000],'calcium.html','Minerals',2500,'Ca'],
  ['fe','Iron','mg',[8,18],'iron.html','Minerals',45,'Fe'],
  ['mg','Magnesium','mg',[420,320],'magnesium.html','Minerals',null,'Mg'],
  ['p','Phosphorus','mg',[700,700],'phosphate.html','Minerals',null,'P'],
  ['zn','Zinc','mg',[11,8],'zinc.html','Minerals',40,'Zn'],
  ['cu','Copper','mg',[0.9,0.9],'copper.html','Minerals',10,'Cu'],
  ['se','Selenium','µg',[55,55],'selenium.html','Minerals',400,'Se'],
  ['na','Sodium','mg',[1500,1500],'sodium.html','Electrolytes',null,'Na'],
  ['k','Potassium','mg',[3400,2600],'potassium.html','Electrolytes',null,'K'],
  ['a','Vitamin A','µg',[900,700],'vitamina.html','Vitamins',3000,'A'],
  ['b1','B1 Thiamine','mg',[1.2,1.1],'vitaminb1thiamine.html','Vitamins',null,'B1'],
  ['b2','B2 Riboflavin','mg',[1.3,1.1],'vitaminb2riboflavin.html','Vitamins',null,'B2'],
  ['b3','B3 Niacin','mg',[16,14],'vitaminb3niacin.html','Vitamins',null,'B3'],
  ['b5','B5 Pantothenic','mg',[5,5],'vitaminb5pantothenicacid.html','Vitamins',null,'B5'],
  ['b6','B6','mg',[1.3,1.3],'vitaminb6pyridoxine.html','Vitamins',100,'B6'],
  ['b9','B9 Folate','µg',[400,400],'vitaminb9folate.html','Vitamins',null,'Folate'],
  ['b12','B12','µg',[2.4,2.4],'vitaminb12cobalamin.html','Vitamins',null,'B12'],
  ['c','Vitamin C','mg',[90,75],'vitaminc.html','Vitamins',2000,'C'],
  ['d','Vitamin D','µg',[15,15],'vitamind.html','Vitamins',100,'D'],
  ['e','Vitamin E','mg',[15,15],'vitamine.html','Vitamins',null,'E'],
  ['k1','Vitamin K1','µg',[120,90],'vitamink1.html','Vitamins',null,'K1'],
  ['gly','Glycine','g',[10,10],'glycinecollagen.html','Beyond the RDA',null,'Glycine'],
  // EPA + DHA has no RDA; 250–500 mg/day is the usual recommendation, and 500 mg is used here.
  ['epadha','EPA + DHA','mg',[500,500],'linoleic-acid.html','Omega-3 & omega-6',null,'EPA+DHA'],
  // ALA's AI is shown for reference only: conversion to EPA/DHA is poor, so it is not treated as a target.
  ['ala','ALA (plant omega-3)','g',[1.6,1.1],'linoleic-acid.html','Omega-3 & omega-6',null,'ALA','info'],
  // Linoleic acid: [need, keep-under] as % of calories. Green up to 2.5%, gold to 5%, red above.
  ['la','Linoleic acid (omega-6)','g',[2.5,5],'linoleic-acid.html','Omega-3 & omega-6',null,'LA','limit'],
];
