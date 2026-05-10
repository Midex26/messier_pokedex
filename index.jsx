import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { objectAltitude, sunAltitude } from "./src/astronomy.js";

function seededRng(seed) {
  let s = seed * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

const RAW = [
  [1,"Nébuleuse du Crabe","Nébuleuse",2,"Nov – Mar","Taureau","Résidu de supernova de 1054, à 6 500 al. Un pulsar en son centre tourne 30 fois par seconde.",5.576,22.014],
  [2,"Amas de M2","Amas globulaire",2,"Août – Nov","Verseau","L'un des plus grands amas globulaires, ~150 000 étoiles à 37 000 al.",21.558,-0.823],
  [3,"Amas de M3","Amas globulaire",1,"Avr – Juil","Chiens de Chasse","Un des plus beaux amas globulaires du ciel nord, ~500 000 étoiles. Visible aux jumelles.",13.703,28.377],
  [4,"Amas de M4","Amas globulaire",1,"Mai – Août","Scorpion","L'amas globulaire le plus proche à ~7 200 al. Facilement résolu au télescope.",16.393,-26.526],
  [5,"Amas de M5","Amas globulaire",1,"Mai – Août","Serpent","Superbe amas de ~100 000 étoiles à 24 500 al, parmi les plus anciens connus (~13 Ga).",15.309,2.081],
  [6,"Amas du Papillon","Amas ouvert",1,"Juin – Sept","Scorpion","Amas de ~80 étoiles dont la forme évoque un papillon en vol.",17.672,-32.253],
  [7,"Amas de Ptolémée","Amas ouvert",1,"Juin – Août","Scorpion","Mentionné par Ptolémée en 130 ap. J.-C. Riche amas de ~80 étoiles visible à l'oeil nu.",17.898,-34.793],
  [8,"Nébuleuse de la Lagune","Nébuleuse",1,"Juin – Sept","Sagittaire","Grande nébuleuse d'émission visible à l'oeil nu sous bon ciel, à 4 100 al.",18.060,-24.383],
  [9,"Amas de M9","Amas globulaire",3,"Juin – Sept","Ophiuchus","Proche du centre galactique, partiellement obscurci par des nuages de poussière interstellaire.",17.320,-18.516],
  [10,"Amas de M10","Amas globulaire",1,"Mai – Août","Ophiuchus","Bel amas globulaire à ~14 300 al. Forme une belle paire visuelle avec M12.",16.953,-4.100],
  [11,"Amas du Canard Sauvage","Amas ouvert",1,"Juil – Oct","Ecu de Sobieski","L'un des amas ouverts les plus denses, avec ~2 900 étoiles disposées en éventail.",18.852,-6.267],
  [12,"Amas de M12","Amas globulaire",1,"Mai – Août","Ophiuchus","Amas globulaire peu concentré à ~16 000 al. Beau couple visuel avec M10.",16.787,-1.948],
  [13,"Grand Amas d'Hercule","Amas globulaire",1,"Avr – Oct","Hercule","Le plus célèbre amas globulaire du ciel nord, ~300 000 étoiles à 25 000 al.",16.695,36.460],
  [14,"Amas de M14","Amas globulaire",2,"Juin – Oct","Ophiuchus","Amas globulaire assez étendu et légèrement elliptique, à ~30 000 al.",17.627,-3.246],
  [15,"Grand Amas de Pégase","Amas globulaire",1,"Août – Nov","Pégase","L'un des amas globulaires les plus denses, à 33 600 al.",21.499,12.167],
  [16,"Nébuleuse de l'Aigle","Nébuleuse",1,"Juin – Sept","Serpent","Région de formation stellaire à 7 000 al. Abrite les célèbres Piliers de la Création.",18.313,-13.817],
  [17,"Nébuleuse Oméga","Nébuleuse",1,"Juin – Sept","Sagittaire","Brillante nébuleuse en forme de cygne ou de fer à cheval, riche en jeunes étoiles, à 5 000 al.",18.341,-16.177],
  [18,"Amas de M18","Amas ouvert",2,"Juin – Sept","Sagittaire","Amas ouvert peu spectaculaire d'une vingtaine d'étoiles bleues-blanches jeunes.",18.333,-17.102],
  [19,"Amas de M19","Amas globulaire",2,"Mai – Août","Ophiuchus","Amas globulaire légèrement aplati, l'un des plus oblates connus, à 28 000 al.",17.044,-26.268],
  [20,"Nébuleuse Trifide","Nébuleuse",2,"Juin – Août","Sagittaire","Nébuleuse divisée en trois lobes par des couloirs sombres, alliant émission et réflexion.",18.040,-23.030],
  [21,"Amas de M21","Amas ouvert",2,"Juin – Sept","Sagittaire","Amas ouvert d'une cinquantaine d'étoiles jeunes, proche de la Nébuleuse Trifide.",18.070,-22.483],
  [22,"Grand Amas du Sagittaire","Amas globulaire",1,"Juin – Sept","Sagittaire","L'un des plus grands amas globulaires, à ~10 400 al. Parmi les plus lumineux du ciel.",18.607,-23.905],
  [23,"Amas de M23","Amas ouvert",1,"Juin – Sept","Sagittaire","Riche amas de ~150 étoiles dans une belle région de Voie Lactée, à ~2 150 al.",17.948,-19.017],
  [24,"Nuage du Sagittaire","Nuage stellaire",1,"Juin – Août","Sagittaire","Fenêtre sur le coeur de la Voie Lactée, visible à l'oeil nu. Des milliards d'étoiles en une tache.",18.282,-18.483],
  [25,"Amas de M25","Amas ouvert",1,"Juin – Sept","Sagittaire","Amas ouvert de ~50 étoiles contenant la céphéide U Sgr, étoile pulsante remarquable.",18.527,-19.250],
  [26,"Amas de M26","Amas ouvert",2,"Juil – Oct","Ecu de Sobieski","Amas ouvert assez pauvre d'une vingtaine d'étoiles avec un centre peu condensé.",18.755,-9.383],
  [27,"Nébuleuse de l'Haltère","Nébuleuse planétaire",1,"Juin – Nov","Petit Renard","Première nébuleuse planétaire découverte (1764), la plus grande et brillante du ciel.",19.993,22.721],
  [28,"Amas de M28","Amas globulaire",2,"Juin – Sept","Sagittaire","Amas globulaire compact à ~18 000 al. Premier amas où un pulsar milliseconde fut découvert.",18.409,-24.870],
  [29,"Amas de M29","Amas ouvert",2,"Juil – Nov","Cygne","Petit amas de ~50 étoiles dans le Cygne, dans une région obscurcie par des nuages de gaz.",20.399,38.523],
  [30,"Amas de M30","Amas globulaire",2,"Août – Nov","Capricorne","Amas globulaire très condensé en son centre (effondrement du coeur), à ~28 000 al.",21.673,-23.180],
  [31,"Galaxie d'Andromède","Galaxie",1,"Août – Jan","Andromède","La galaxie spirale la plus proche, visible à l'oeil nu à 2,5 millions d'al. ~1 000 milliards d'étoiles.",0.712,41.269],
  [32,"Galaxie M32","Galaxie",2,"Août – Jan","Andromède","Galaxie naine elliptique satellite de M31, avec un noyau très compact et brillant.",0.712,40.866],
  [33,"Galaxie du Triangle","Galaxie",3,"Août – Jan","Triangle","Galaxie spirale à 2,7 Mal. Très faible brillance de surface — exige un ciel parfaitement noir.",1.564,30.660],
  [34,"Amas de M34","Amas ouvert",1,"Oct – Mar","Persée","Amas ouvert d'une centaine d'étoiles bien résolu aux jumelles, à ~1 400 al.",2.702,42.767],
  [35,"Amas de M35","Amas ouvert",1,"Nov – Avr","Gémeaux","Riche amas de plusieurs centaines d'étoiles, avec l'amas NGC 2158 visible en arrière-plan.",6.152,24.350],
  [36,"Amas de M36","Amas ouvert",1,"Nov – Avr","Cocher","Amas ouvert de ~60 étoiles jeunes dans le Cocher, le moins riche du trio.",5.603,34.135],
  [37,"Amas de M37","Amas ouvert",1,"Nov – Avr","Cocher","Le plus riche des trois amas du Cocher, avec ~150 étoiles et une géante rouge centrale.",5.872,32.551],
  [38,"Amas de M38","Amas ouvert",1,"Nov – Avr","Cocher","Amas ouvert de forme cruciforme d'une centaine d'étoiles dans le Cocher, à ~4 200 al.",5.478,35.850],
  [39,"Amas de M39","Amas ouvert",1,"Août – Déc","Cygne","Amas très dispersé d'une trentaine d'étoiles brillantes, très proche à ~825 al.",21.530,48.433],
  [40,"Winnecke 4","Etoile double",3,"Mar – Juin","Grande Ourse","Paire d'étoiles sans lien physique. Messier ne trouva pas la nébuleuse cherchée à cet endroit.",12.370,58.083],
  [41,"Amas de M41","Amas ouvert",1,"Déc – Mar","Grand Chien","Amas de ~100 étoiles avec une géante rouge en son centre, visible à l'oeil nu.",6.767,-20.750],
  [42,"Grande Nébuleuse d'Orion","Nébuleuse",1,"Nov – Mar","Orion","La nébuleuse la plus célèbre du ciel, visible à l'oeil nu. Immense pouponnière stellaire à 1 350 al.",5.588,-5.391],
  [43,"Nébuleuse de Mairan","Nébuleuse",2,"Nov – Mar","Orion","Extension de M42 séparée par un lobe sombre. Ionisée par une seule étoile chaude.",5.592,-5.267],
  [44,"Ruche – Praesepe","Amas ouvert",1,"Déc – Mai","Cancer","Amas ouvert proche visible à l'oeil nu, l'un des plus vieux connus (~730 millions d'années).",8.673,19.983],
  [45,"Pléiades","Amas ouvert",1,"Oct – Avr","Taureau","L'amas le plus célèbre du ciel, visible à l'oeil nu. Entouré d'une nébuleuse par réflexion bleue.",3.790,24.117],
  [46,"Amas de M46","Amas ouvert",1,"Jan – Avr","Poupe","Riche amas de ~500 étoiles avec une nébuleuse planétaire (NGC 2438) en avant-plan fortuit.",7.697,-14.817],
  [47,"Amas de M47","Amas ouvert",1,"Jan – Avr","Poupe","Amas dispersé d'~50 étoiles brillantes, visible à l'oeil nu. Beau contraste avec M46 adjacent.",7.610,-14.500],
  [48,"Amas de M48","Amas ouvert",1,"Jan – Avr","Hydre","Amas de ~80 étoiles avec quelques géantes orangées, à ~1 500 al.",8.228,-5.750],
  [49,"Galaxie M49","Galaxie",2,"Fév – Juin","Vierge","Première galaxie découverte dans l'Amas de la Vierge et la plus brillante du groupe.",12.496,8.001],
  [50,"Amas de M50","Amas ouvert",1,"Déc – Avr","Licorne","Amas dense de ~200 étoiles avec une géante rouge en son centre, à ~3 000 al.",7.053,-8.333],
  [51,"Galaxie du Tourbillon","Galaxie",1,"Mar – Août","Chiens de Chasse","Superbe spirale en interaction avec NGC 5195. Structure en spirale visible au télescope.",13.498,47.195],
  [52,"Amas de M52","Amas ouvert",1,"Août – Déc","Cassiopée","Riche amas de ~200 étoiles en forme de coin dans Cassiopée, à ~5 000 al.",23.403,61.583],
  [53,"Amas de M53","Amas globulaire",2,"Mar – Juil","Chevelure","Amas globulaire parmi les plus éloignés du centre galactique, à ~58 000 al.",13.215,18.168],
  [54,"Amas de M54","Amas globulaire",3,"Juin – Sept","Sagittaire","Appartient à la Galaxie naine du Sagittaire — l'un des rares amas extragalactiques du catalogue.",18.918,-30.480],
  [55,"Amas de M55","Amas globulaire",2,"Juin – Oct","Sagittaire","Grand amas globulaire peu concentré à ~17 000 al. Assez bas sur l'horizon depuis la France.",19.667,-30.965],
  [56,"Amas de M56","Amas globulaire",2,"Juil – Nov","Lyre","Amas globulaire peu condensé à ~32 000 al, dans un riche champ de Voie Lactée.",19.276,30.184],
  [57,"Nébuleuse de la Lyre","Nébuleuse planétaire",1,"Juin – Nov","Lyre","Icône des nébuleuses planétaires, en forme d'anneau de fumée, à ~2 300 al.",18.893,33.029],
  [58,"Galaxie M58","Galaxie",2,"Mar – Juil","Vierge","L'une des plus brillantes galaxies de l'Amas de la Vierge, spirale barrée à ~62 Mal.",12.629,11.818],
  [59,"Galaxie M59","Galaxie",2,"Mar – Juil","Vierge","Grande galaxie elliptique avec un trou noir de 270 millions de masses solaires.",12.701,11.647],
  [60,"Galaxie M60","Galaxie",2,"Mar – Juil","Vierge","Massive galaxie elliptique avec un trou noir de ~4,5 milliards de masses solaires.",12.728,11.553],
  [61,"Galaxie M61","Galaxie",2,"Mar – Juin","Vierge","Belle spirale face-à-nous, l'une des plus grandes de l'Amas de la Vierge. Nombreuses supernovae.",12.365,4.474],
  [62,"Amas de M62","Amas globulaire",2,"Mai – Août","Ophiuchus","Amas asymétrique perturbé par sa proximité au centre galactique, à ~22 000 al.",17.020,-30.112],
  [63,"Galaxie du Tournesol","Galaxie",2,"Mar – Juil","Chiens de Chasse","Galaxie spirale aux bras bien définis et nombreuses régions HII brillantes, à ~27 Mal.",13.264,42.029],
  [64,"Galaxie de l'Oeil Noir","Galaxie",2,"Mar – Juil","Chevelure","Reconnaissable à son nuage sombre interne tournant en sens inverse du reste de la galaxie.",12.945,21.683],
  [65,"Galaxie M65","Galaxie",2,"Fév – Juin","Lion","Membre du Triplet du Lion, galaxie spirale inclinée avec peu de gaz et de formation stellaire.",11.316,13.092],
  [66,"Galaxie M66","Galaxie",2,"Fév – Juin","Lion","La plus brillante du Triplet du Lion, déformée par l'interaction avec M65 et NGC 3628.",11.338,12.992],
  [67,"Amas de M67","Amas ouvert",1,"Déc – Mai","Cancer","L'un des plus vieux amas ouverts connus (~4 Ga), avec plus de 500 étoiles semblables au Soleil.",8.857,11.817],
  [68,"Amas de M68","Amas globulaire",3,"Mar – Juin","Hydre","Amas globulaire peu concentré à ~33 000 al, très bas sur l'horizon depuis la France.",12.658,-26.743],
  [69,"Amas de M69","Amas globulaire",3,"Juin – Août","Sagittaire","Proche du centre galactique (~28 000 al), très bas depuis la France métropolitaine.",18.523,-32.348],
  [70,"Amas de M70","Amas globulaire",3,"Juin – Août","Sagittaire","Jumeau de M69, à 29 000 al. Aussi très bas sur l'horizon depuis la France.",18.720,-32.292],
  [71,"Amas de M71","Amas globulaire",2,"Juil – Nov","Flèche","Longtemps classé comme amas ouvert, c'est un amas globulaire peu concentré, à ~13 000 al.",19.896,18.779],
  [72,"Amas de M72","Amas globulaire",3,"Août – Nov","Verseau","Amas globulaire peu concentré et lointain (~55 000 al), difficile à résoudre en étoiles.",20.891,-12.537],
  [73,"Astérisme de M73","Astérisme",2,"Août – Nov","Verseau","Groupe de quatre étoiles sans relation physique. Messier le prit pour une nébuleuse sans étoiles.",20.982,-12.633],
  [74,"Galaxie Fantôme","Galaxie",3,"Sept – Jan","Poissons","Galaxie spirale parfaite vue de face mais à très faible brillance de surface. La plus difficile du catalogue.",1.612,15.784],
  [75,"Amas de M75","Amas globulaire",3,"Juil – Nov","Sagittaire","L'un des amas globulaires les plus concentrés et les plus éloignés, à ~67 500 al.",20.101,-21.921],
  [76,"Petite Nébuleuse Haltère","Nébuleuse planétaire",3,"Sept – Fév","Persée","La plus faible nébuleuse planétaire du catalogue, formée de deux lobes distincts.",1.706,51.575],
  [77,"Galaxie de la Baleine","Galaxie",3,"Oct – Fév","Baleine","Galaxie de Seyfert avec un noyau actif très lumineux masquant une structure spirale barrée.",2.711,-0.013],
  [78,"Nébuleuse M78","Nébuleuse",2,"Nov – Mar","Orion","La nébuleuse par réflexion la plus brillante du ciel, à 1 350 al dans Orion.",5.780,0.014],
  [79,"Amas de M79","Amas globulaire",2,"Nov – Mar","Lièvre","Rare amas globulaire d'hiver à ~41 000 al, possiblement capturé depuis une galaxie naine.",5.403,-24.524],
  [80,"Amas de M80","Amas globulaire",2,"Mai – Août","Scorpion","L'un des amas globulaires les plus denses, à ~32 000 al. Nova observée en 1860.",16.284,-22.975],
  [81,"Galaxie de Bode","Galaxie",1,"Nov – Juil","Grande Ourse","Belle galaxie spirale à ~12 Mal, observable aux jumelles. Paire célèbre avec M82.",9.926,69.065],
  [82,"Galaxie du Cigare","Galaxie",1,"Nov – Juil","Grande Ourse","Galaxie irrégulière en interaction avec M81, siège d'une intense activité de formation stellaire.",9.931,69.680],
  [83,"Galaxie de la Roue à Aiguilles","Galaxie",2,"Avr – Juil","Hydre","Superbe spirale vue de face à ~15 Mal, mais très basse sur l'horizon depuis la France.",13.617,-29.866],
  [84,"Galaxie M84","Galaxie",2,"Mar – Juil","Vierge","Galaxie elliptique massive de l'Amas de la Vierge, avec un jet de matière de son trou noir.",12.418,12.887],
  [85,"Galaxie M85","Galaxie",2,"Mar – Juil","Chevelure","Galaxie lenticulaire brillante, la plus septentrionale de l'Amas de la Vierge, à ~60 Mal.",12.423,18.191],
  [86,"Galaxie M86","Galaxie",2,"Mar – Juil","Vierge","Galaxie elliptique géante qui se rapproche de nous en plongeant dans l'Amas de la Vierge.",12.436,12.946],
  [87,"Galaxie M87 (Virgo A)","Galaxie",2,"Mar – Juil","Vierge","Galaxie géante au trou noir du premier portrait photographié (2019). Jet relativiste spectaculaire.",12.514,12.391],
  [88,"Galaxie M88","Galaxie",2,"Mar – Juil","Chevelure","Galaxie spirale brillante de l'Amas de la Vierge, bras bien définis vus légèrement de côté.",12.533,14.421],
  [89,"Galaxie M89","Galaxie",2,"Mar – Juil","Vierge","Galaxie elliptique quasi-sphérique entourée d'une vaste enveloppe de jets et résidus stellaires.",12.594,12.556],
  [90,"Galaxie M90","Galaxie",2,"Mar – Juil","Vierge","L'une des rares galaxies à se rapprocher de nous (blueshifted), plongeant dans l'Amas de la Vierge.",12.614,13.163],
  [91,"Galaxie M91","Galaxie",2,"Mar – Juil","Chevelure","Galaxie spirale barrée de l'Amas de la Vierge. Longtemps l'objet manquant de Messier.",12.591,14.496],
  [92,"Amas de M92","Amas globulaire",1,"Mai – Nov","Hercule","Magnifique amas globulaire souvent éclipsé par M13, mais tout aussi remarquable par sa concentration.",17.285,43.136],
  [93,"Amas de M93","Amas ouvert",1,"Jan – Avr","Poupe","Bel amas de ~80 étoiles en forme de papillon, à ~3 600 al dans la Poupe.",7.743,-23.867],
  [94,"Galaxie de l'Oeil de Chat","Galaxie",2,"Mar – Juil","Chiens de Chasse","Galaxie spirale à anneau interne très brillant autour d'un noyau compact, due à une résonance orbitale.",12.848,41.121],
  [95,"Galaxie M95","Galaxie",2,"Fév – Juin","Lion","Galaxie spirale barrée avec un anneau de formation stellaire autour de la barre centrale, à ~33 Mal.",10.733,11.704],
  [96,"Galaxie M96","Galaxie",2,"Fév – Juin","Lion","La plus brillante du Groupe de M96, galaxie spirale avec un noyau lumineux et des bras asymétriques.",10.779,11.820],
  [97,"Nébuleuse du Hibou","Nébuleuse planétaire",3,"Fév – Juin","Grande Ourse","Grande nébuleuse planétaire à très faible brillance. Deux taches sombres évoquent des yeux de hibou.",11.246,55.019],
  [98,"Galaxie M98","Galaxie",2,"Mar – Juil","Chevelure","Galaxie spirale vue quasi de profil, se rapprochant de nous (blueshifted), à ~44 Mal.",12.230,14.900],
  [99,"Galaxie de la Roue de Charrue","Galaxie",2,"Mar – Juil","Chevelure","Galaxie spirale quasi-parfaite vue de face, nombreuses régions de formation stellaire, à ~59 Mal.",12.314,14.416],
  [100,"Galaxie M100","Galaxie",2,"Mar – Juil","Chevelure","Grande et brillante spirale de l'Amas de la Vierge, l'une des premières cibles du télescope Hubble.",12.382,15.823],
  [101,"Galaxie du Moulinet","Galaxie",2,"Mar – Août","Grande Ourse","Grande spirale asymétrique vue de face à 27 Mal. Ses bras spiraux sont décalés du centre.",14.053,54.349],
  [102,"Galaxie Fuseau","Galaxie",2,"Avr – Août","Dragon","Probablement NGC 5866, belle lenticulaire vue par la tranche avec une bande de poussière distincte.",15.108,55.763],
  [103,"Amas de M103","Amas ouvert",1,"Sept – Fév","Cassiopée","Amas ouvert en forme de triangle de ~40 étoiles dans une riche région de Cassiopée.",1.553,60.700],
  [104,"Galaxie Sombrero","Galaxie",2,"Avr – Juil","Vierge","Galaxie spirale vue presque de profil avec une bande de poussière spectaculaire et un immense bulbe.",12.666,-11.623],
  [105,"Galaxie M105","Galaxie",2,"Fév – Juin","Lion","Galaxie elliptique brillante du Groupe de M96, trou noir de 200 millions de masses solaires.",10.797,12.582],
  [106,"Galaxie M106","Galaxie",2,"Mar – Juil","Chiens de Chasse","Grande galaxie spirale avec un noyau actif et des jets de gaz chaud visibles en radio, à ~22 Mal.",12.316,47.304],
  [107,"Amas de M107","Amas globulaire",2,"Mai – Août","Ophiuchus","Amas globulaire peu concentré à ~21 000 al, l'un des derniers ajoutés au catalogue de Messier.",16.542,-13.054],
  [108,"Galaxie M108","Galaxie",3,"Fév – Juin","Grande Ourse","Galaxie spirale vue par la tranche avec une structure irrégulière et chaotique, à ~46 Mal.",11.192,55.674],
  [109,"Galaxie M109","Galaxie",3,"Mar – Juil","Grande Ourse","Galaxie spirale barrée à ~83 Mal, difficile à observer près de Phad. Parmi les plus lointaines.",11.960,53.374],
  [110,"Galaxie M110","Galaxie",2,"Août – Jan","Andromède","Grande galaxie naine elliptique satellite de M31, visible aux jumelles comme une tache allongée diffuse.",0.673,41.685],
];

const MESSIER = RAW.map(([n,name,type,diff,months,constellation,desc,ra,dec]) => ({id:`M${n}`,n,name,type,diff,months,constellation,desc,ra,dec}));
const TYPE_COLOR = {"Galaxie":"#a78bfa","Nébuleuse":"#f472b6","Amas globulaire":"#fbbf24","Amas ouvert":"#34d399","Nébuleuse planétaire":"#60a5fa","Nuage stellaire":"#e2e8f0","Etoile double":"#f1f5f9","Astérisme":"#94a3b8"};
const DIFF = {1:{label:"Facile",color:"#22c55e"},2:{label:"Moyen",color:"#f97316"},3:{label:"Difficile",color:"#ef4444"}};
const TYPES = [...new Set(MESSIER.map(o => o.type))];

function Placeholder({n, type}) {
  const el = useMemo(() => {
    const r = seededRng(n);
    const c = TYPE_COLOR[type] || "#94a3b8";
    const bg = "#05050f";

    if (type === "Amas globulaire") {
      const pts = Array.from({length:120}, (_, i) => {
        const R = Math.sqrt(i/120)*75, theta = i*2.399963;
        return {x:100+Math.cos(theta)*R, y:100+Math.sin(theta)*R, s:0.3+(1-i/120)*1.8, o:0.25+(1-i/120)*0.75};
      });
      return (
        <>
          <rect width="200" height="200" fill={bg}/>
          <circle cx="100" cy="100" r="75" fill={c} opacity="0.06"/>
          <circle cx="100" cy="100" r="38" fill={c} opacity="0.1"/>
          {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={i<30?"white":c} opacity={p.o}/>)}
          <circle cx="100" cy="100" r="7" fill="white" opacity="0.95"/>
        </>
      );
    }
    if (type === "Galaxie") {
      const ang = (n*37)%180;
      const stars = Array.from({length:22}, () => ({x:r()*178+11, y:r()*178+11, o:r()*0.5+0.1}));
      return (
        <>
          <rect width="200" height="200" fill={bg}/>
          {stars.map((s,i) => <circle key={i} cx={s.x} cy={s.y} r="0.8" fill="white" opacity={s.o}/>)}
          <g transform={`rotate(${ang} 100 100)`}>
            <ellipse cx="100" cy="100" rx="78" ry="22" fill="none" stroke={c} strokeWidth="4" opacity="0.2"/>
            <ellipse cx="100" cy="100" rx="58" ry="15" fill="none" stroke={c} strokeWidth="8" opacity="0.25"/>
            <ellipse cx="100" cy="100" rx="35" ry="10" fill={c} opacity="0.4"/>
          </g>
          <circle cx="100" cy="100" r="18" fill={c} opacity="0.15"/>
          <circle cx="100" cy="100" r="8" fill="white" opacity="0.9"/>
        </>
      );
    }
    if (type === "Nébuleuse") {
      const cx1=65+r()*25, cy1=65+r()*25, cx2=110+r()*20, cy2=110+r()*20;
      const id1=`na${n}`, id2=`nb${n}`;
      return (
        <>
          <defs>
            <radialGradient id={id1}><stop offset="0%" stopColor={c} stopOpacity="0.9"/><stop offset="100%" stopColor={c} stopOpacity="0"/></radialGradient>
            <radialGradient id={id2}><stop offset="0%" stopColor="#60a5fa" stopOpacity="0.7"/><stop offset="100%" stopColor="#60a5fa" stopOpacity="0"/></radialGradient>
          </defs>
          <rect width="200" height="200" fill={bg}/>
          <ellipse cx={cx1} cy={cy1} rx={55+r()*20} ry={45+r()*15} fill={`url(#${id1})`}/>
          <ellipse cx={cx2} cy={cy2} rx={52+r()*15} ry={42+r()*15} fill={`url(#${id2})`}/>
          {Array.from({length:18}, (_,i) => <circle key={i} cx={r()*178+11} cy={r()*178+11} r="0.9" fill="white" opacity={r()*0.6+0.2}/>)}
        </>
      );
    }
    if (type === "Nébuleuse planétaire") {
      const id = `np${n}`;
      return (
        <>
          <defs>
            <radialGradient id={id}>
              <stop offset="0%" stopColor={c} stopOpacity="0.05"/>
              <stop offset="62%" stopColor={c} stopOpacity="0.9"/>
              <stop offset="100%" stopColor={c} stopOpacity="0.05"/>
            </radialGradient>
          </defs>
          <rect width="200" height="200" fill={bg}/>
          <circle cx="100" cy="100" r="62" fill={`url(#${id})`}/>
          <circle cx="100" cy="100" r="20" fill={c} opacity="0.12"/>
          <circle cx="100" cy="100" r="5" fill="white" opacity="0.95"/>
          {Array.from({length:16}, (_,i) => (
            <circle key={i} cx={100+Math.cos(i/16*Math.PI*2)*64} cy={100+Math.sin(i/16*Math.PI*2)*64} r="0.7" fill="white" opacity={0.25}/>
          ))}
        </>
      );
    }
    if (type === "Amas ouvert") {
      const pts = Array.from({length:48}, () => {
        const theta = r()*Math.PI*2, R = r()*80;
        return {x:100+Math.cos(theta)*R, y:100+Math.sin(theta)*R, s:r()*1.8+0.4, colored:r()>0.8};
      });
      return (
        <>
          <rect width="200" height="200" fill={bg}/>
          {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={p.colored?c:"white"} opacity={0.4+r()*0.55}/>)}
        </>
      );
    }
    const pts = Array.from({length:24}, () => ({x:r()*178+11, y:r()*178+11, s:r()*1.5+0.4}));
    return (
      <>
        <rect width="200" height="200" fill={bg}/>
        {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r={p.s} fill={i<4?c:"white"} opacity={0.3+r()*0.55}/>)}
        <circle cx="100" cy="100" r="12" fill={c} opacity="0.2"/>
        <circle cx="100" cy="100" r="6" fill="white" opacity="0.9"/>
      </>
    );
  }, [n, type]);

  return <svg viewBox="0 0 200 200" style={{width:"100%",height:"100%",display:"block"}}>{el}</svg>;
}

function Card({obj, photo, onClick}) {
  const [hov, setHov] = useState(false);
  const dc = DIFF[obj.diff];
  const tc = TYPE_COLOR[obj.type] || "#94a3b8";
  return (
    <div onClick={onClick} onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{cursor:"pointer",borderRadius:12,overflow:"hidden",background:"#0d0d1f",border:`1px solid ${hov?tc+"55":"#1a1a35"}`,transition:"all 0.2s",transform:hov?"translateY(-3px)":"none",boxShadow:hov?`0 8px 24px ${tc}22`:"none"}}>
      <div style={{aspectRatio:"1",position:"relative",overflow:"hidden",background:"#05050f"}}>
        {photo
          ? <img src={photo} alt={obj.name} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/>
          : <Placeholder n={obj.n} type={obj.type}/>
        }
        <div style={{position:"absolute",top:8,right:8,width:10,height:10,borderRadius:"50%",background:dc.color,boxShadow:`0 0 7px ${dc.color}`,border:"1.5px solid #0d0d1f"}}/>
        {photo && <div style={{position:"absolute",bottom:6,left:6,background:"rgba(0,0,0,0.7)",borderRadius:4,padding:"2px 6px",fontSize:9,color:"#fff",letterSpacing:0.5}}>📷 MON SHOT</div>}
      </div>
      <div style={{padding:"8px 10px 10px"}}>
        <div style={{fontWeight:800,fontSize:13,color:"#e2e8f0",fontFamily:"monospace",letterSpacing:1}}>{obj.id}</div>
        <div style={{fontSize:10,color:tc,marginTop:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",fontWeight:500}}>{obj.name}</div>
      </div>
    </div>
  );
}

function Modal({obj, photo, onClose, onUpload, uploading}) {
  const fileRef = useRef();
  const [imgHov, setImgHov] = useState(false);
  const dc = DIFF[obj.diff];
  const tc = TYPE_COLOR[obj.type] || "#94a3b8";

  useEffect(() => {
    const h = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const handleFile = e => {
    const f = e.target.files && e.target.files[0];
    if (f) onUpload(f);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",backdropFilter:"blur(10px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{background:"#080818",border:`1px solid ${tc}44`,borderRadius:20,maxWidth:860,width:"100%",maxHeight:"92vh",overflow:"auto",position:"relative",boxShadow:`0 24px 80px ${tc}22`}}>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(255,255,255,0.1)",border:"none",color:"#fff",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:15,zIndex:2,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        <div style={{display:"flex",flexDirection:"row",minHeight:420}}>
          {/* Photo side */}
          <div onMouseEnter={()=>setImgHov(true)} onMouseLeave={()=>setImgHov(false)} onClick={()=>fileRef.current && fileRef.current.click()}
            style={{flex:"0 0 44%",position:"relative",cursor:"pointer",background:"#05050f",borderRadius:"20px 0 0 20px",overflow:"hidden",minHeight:380}}>
            {photo
              ? <img src={photo} alt={obj.name} style={{width:"100%",height:"100%",objectFit:"cover",minHeight:380,display:"block"}}/>
              : <div style={{width:"100%",height:"100%",minHeight:380}}><Placeholder n={obj.n} type={obj.type}/></div>
            }
            <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",opacity:imgHov?1:0,transition:"opacity 0.2s"}}>
              <div style={{background:tc,color:"#000",borderRadius:10,padding:"10px 20px",fontWeight:800,fontSize:13}}>
                {uploading ? "Envoi..." : photo ? "📷 Changer la photo" : "📷 Ajouter ma photo"}
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
          </div>
          {/* Info side */}
          <div style={{flex:1,padding:"32px 28px",display:"flex",flexDirection:"column",gap:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <span style={{fontSize:38,fontWeight:900,color:"#fff",fontFamily:"monospace",letterSpacing:2}}>{obj.id}</span>
              <span style={{background:tc+"20",color:tc,borderRadius:6,padding:"3px 9px",fontSize:11,fontWeight:600,border:`1px solid ${tc}33`}}>{obj.type}</span>
            </div>
            <div style={{fontSize:18,fontWeight:700,color:"#e2e8f0",lineHeight:1.35}}>{obj.name}</div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{width:11,height:11,borderRadius:"50%",background:dc.color,boxShadow:`0 0 9px ${dc.color}`,display:"inline-block",flexShrink:0}}/>
              <span style={{color:dc.color,fontSize:13,fontWeight:700}}>{dc.label}</span>
            </div>
            <div style={{height:1,background:"rgba(255,255,255,0.07)"}}/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div style={{display:"flex",gap:12}}>
                <span style={{color:"#475569",fontSize:12,minWidth:130}}>🗓 Période idéale</span>
                <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{obj.months}</span>
              </div>
              <div style={{display:"flex",gap:12}}>
                <span style={{color:"#475569",fontSize:12,minWidth:130}}>✦ Constellation</span>
                <span style={{color:"#e2e8f0",fontSize:13,fontWeight:600}}>{obj.constellation}</span>
              </div>
            </div>
            <div style={{height:1,background:"rgba(255,255,255,0.07)"}}/>
            <p style={{color:"#94a3b8",fontSize:13,lineHeight:1.75,margin:0}}>{obj.desc}</p>
            <div style={{flex:1}}/>
            <button onClick={()=>fileRef.current && fileRef.current.click()}
              style={{background:tc+"18",border:`1px solid ${tc}44`,color:tc,borderRadius:10,padding:"11px 18px",cursor:"pointer",fontSize:13,fontWeight:700,marginTop:8}}
              onMouseEnter={e=>e.currentTarget.style.background=tc+"35"}
              onMouseLeave={e=>e.currentTarget.style.background=tc+"18"}>
              {uploading ? "Envoi en cours..." : photo ? "📷 Changer la photo" : "📷 Ajouter ma photo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [photos, setPhotos] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterDiff, setFilterDiff] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterVisible, setFilterVisible] = useState(false);
  const [coords, setCoords] = useState(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/photos");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const ph = await r.json();
        setPhotos(ph);
      } catch(e) { console.warn("Load photos:", e); }
      setLoading(false);
    })();
  }, []);

  const handleUpload = useCallback(async (file) => {
    if (!selected) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch(`/api/photos/${selected.id}`, { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const { url } = await r.json();
      setPhotos(p => ({ ...p, [selected.id]: `${url}?t=${Date.now()}` }));
    } catch(e) {
      console.error("Upload error:", e);
      alert(`Upload échoué : ${e.message}`);
    }
    setUploading(false);
  }, [selected]);

  useEffect(() => {
    if (!filterVisible) return;
    if (!coords) {
      if (!navigator.geolocation) {
        setCoords({ lat: 48.85, lon: 2.35, fallback: true });
      } else {
        navigator.geolocation.getCurrentPosition(
          pos => setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude, fallback: false }),
          () => setCoords({ lat: 48.85, lon: 2.35, fallback: true }),
          { timeout: 10000 }
        );
      }
    }
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, [filterVisible, coords]);

  const visibility = useMemo(() => {
    if (!filterVisible || !coords) return null;
    const liveSun = sunAltitude(now, coords.lat, coords.lon);
    if (liveSun < 0) return { time: now, sunAlt: liveSun, preview: false };
    const t = new Date(now);
    t.setHours(23, 0, 0, 0);
    if (t <= now) t.setDate(t.getDate() + 1);
    return { time: t, sunAlt: sunAltitude(t, coords.lat, coords.lon), preview: true };
  }, [filterVisible, coords, now]);

  const filtered = useMemo(() => {
    return MESSIER.filter(o => {
      const q = search.toLowerCase();
      if (q && !o.id.toLowerCase().includes(q) && !o.name.toLowerCase().includes(q)) return false;
      if (filterType !== "all" && o.type !== filterType) return false;
      if (filterDiff !== "all" && o.diff !== Number(filterDiff)) return false;
      if (filterStatus === "done" && !photos[o.id]) return false;
      if (filterStatus === "todo" && photos[o.id]) return false;
      if (filterVisible) {
        if (!visibility || visibility.sunAlt >= 0) return false;
        if (objectAltitude(o.ra, o.dec, visibility.time, coords.lat, coords.lon) < 30) return false;
      }
      return true;
    });
  }, [search, filterType, filterDiff, filterStatus, photos, filterVisible, coords, visibility]);

  const capturedCount = Object.keys(photos).length;
  const pct = Math.round(capturedCount/110*100);

  const importRef = useRef();

  const handleExport = () => {
    window.location.href = "/api/export";
  };

  const handleImport = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    try {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch("/api/import", { method: "POST", body: fd });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${r.status}`);
      }
      const { photos: newPhotos, imported } = await r.json();
      const busted = {};
      for (const [k, v] of Object.entries(newPhotos)) busted[k] = `${v}?t=${Date.now()}`;
      setPhotos(busted);
      alert(`${imported.length} photo(s) importée(s).`);
    } catch(err) {
      alert(`Import échoué : ${err.message}`);
    }
    e.target.value = "";
  };

  const pill = (active, color) => ({
    padding:"5px 12px", borderRadius:20, fontSize:12, cursor:"pointer", fontWeight:600, border:`1px solid ${active?(color||"#6366f1")+"88":"#1a1a35"}`,
    background:active?(color||"#6366f1")+"22":"transparent", color:active?(color||"#818cf8"):"#64748b", transition:"all 0.2s"
  });

  return (
    <div style={{minHeight:"100vh",background:"#080812",color:"#e2e8f0",fontFamily:"system-ui,sans-serif"}}>
      {/* Header */}
      <div style={{background:"#0a0a1e",borderBottom:"1px solid #1a1a35",padding:"16px 20px",position:"sticky",top:0,zIndex:10}}>
        <div style={{maxWidth:1400,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:20,fontWeight:800,letterSpacing:1,color:"#fff"}}>🔭 MESSIER POKÉDEX</div>
              <div style={{fontSize:11,color:"#64748b",marginTop:2}}>Catalogue de Charles Messier — 110 objets du ciel profond</div>
            </div>
            <div style={{textAlign:"right",display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
              <div>
                <div style={{fontSize:26,fontWeight:900,color:"#818cf8"}}>{capturedCount}<span style={{fontSize:14,color:"#4b5563"}}>/110</span></div>
                <div style={{fontSize:10,color:"#4b5563",marginBottom:4}}>{pct}% photographiés</div>
                <div style={{width:120,height:4,background:"#1a1a35",borderRadius:2,overflow:"hidden"}}>
                  <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#6366f1,#a78bfa)",borderRadius:2,transition:"width 0.4s"}}/>
                </div>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={handleExport} title="Exporter mes photos" style={{background:"#6366f122",border:"1px solid #6366f144",color:"#818cf8",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}
                  onMouseEnter={e=>e.currentTarget.style.background="#6366f133"} onMouseLeave={e=>e.currentTarget.style.background="#6366f122"}>
                  ⬇ Exporter
                </button>
                <button onClick={()=>importRef.current && importRef.current.click()} title="Importer mes photos" style={{background:"#a78bfa22",border:"1px solid #a78bfa44",color:"#c4b5fd",borderRadius:8,padding:"5px 12px",cursor:"pointer",fontSize:11,fontWeight:700,display:"flex",alignItems:"center",gap:5}}
                  onMouseEnter={e=>e.currentTarget.style.background="#a78bfa33"} onMouseLeave={e=>e.currentTarget.style.background="#a78bfa22"}>
                  ⬆ Importer
                </button>
                <input ref={importRef} type="file" accept=".zip,application/zip" style={{display:"none"}} onChange={handleImport}/>
              </div>
            </div>
          </div>
          {/* Filters */}
          <div style={{display:"flex",flexWrap:"wrap",gap:8,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  M42 ou Orion..." style={{background:"rgba(255,255,255,0.05)",border:"1px solid #1a1a35",borderRadius:20,padding:"5px 14px",color:"#e2e8f0",fontSize:12,outline:"none",width:180}}/>
            <select value={filterType} onChange={e=>setFilterType(e.target.value)} style={{background:"#0d0d1f",border:"1px solid #1a1a35",borderRadius:20,padding:"5px 12px",color:"#94a3b8",fontSize:12,cursor:"pointer"}}>
              <option value="all">Tous les types</option>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {["all","1","2","3"].map(d => (
              <button key={d} onClick={()=>setFilterDiff(d)} style={pill(filterDiff===d, d==="1"?"#22c55e":d==="2"?"#f97316":d==="3"?"#ef4444":null)}>
                {d==="all"?"Toutes diff.":d==="1"?"● Facile":d==="2"?"● Moyen":"● Difficile"}
              </button>
            ))}
            {["all","done","todo"].map(s => (
              <button key={s} onClick={()=>setFilterStatus(s)} style={pill(filterStatus===s)}>
                {s==="all"?"Tous":s==="done"?"📷 Photographiés":"⬡ À capturer"}
              </button>
            ))}
            <button onClick={()=>setFilterVisible(v=>!v)} style={pill(filterVisible, "#38bdf8")}>
              🌙 Visible maintenant
            </button>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div style={{maxWidth:1400,margin:"0 auto",padding:"20px"}}>
        {loading
          ? <div style={{textAlign:"center",padding:80,color:"#4b5563"}}>Chargement du catalogue...</div>
          : <>
              {filterVisible && !coords && <div style={{fontSize:12,color:"#38bdf8",marginBottom:14}}>📍 Récupération de la position…</div>}
              {filterVisible && coords?.fallback && <div style={{fontSize:11,color:"#64748b",marginBottom:10}}>📍 Position approximative (Paris) — autorise la géolocalisation pour un calcul précis.</div>}
              {filterVisible && visibility?.preview && (
                <div style={{background:"#38bdf81a",border:"1px solid #38bdf844",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#7dd3fc"}}>
                  🌙 <strong>Prévision pour ce soir</strong> — objets au-dessus de 30° le {visibility.time.toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})} à {visibility.time.toLocaleTimeString("fr-FR",{hour:"2-digit",minute:"2-digit"})}
                </div>
              )}
              <div style={{fontSize:12,color:"#4b5563",marginBottom:14}}>{filtered.length} objet{filtered.length>1?"s":""} affiché{filtered.length>1?"s":""}{filterVisible && coords ? ` — au-dessus de 30° depuis ${coords.lat.toFixed(2)}°, ${coords.lon.toFixed(2)}°` : ""}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:12}}>
                {filtered.map(obj => <Card key={obj.id} obj={obj} photo={photos[obj.id]} onClick={()=>setSelected(obj)}/>)}
              </div>
              {filtered.length === 0 && <div style={{textAlign:"center",padding:60,color:"#4b5563"}}>{filterVisible ? (visibility?.sunAlt >= 0 ? "Le soleil ne se couche pas ce soir depuis ta position." : "Aucun objet ne sera à plus de 30° au-dessus de l'horizon.") : "Aucun objet ne correspond aux filtres."}</div>}
            </>
        }
      </div>

      {selected && (
        <Modal obj={selected} photo={photos[selected.id]} onClose={()=>setSelected(null)} onUpload={handleUpload} uploading={uploading}/>
      )}
    </div>
  );
}