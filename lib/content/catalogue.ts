import type { Category, Concept, Translation } from "@/types";
import { burmese } from "./burmese";
export const categories: Category[] = [
  ["vehicles", "Vehicles", "truck"],
  ["animals", "Animals", "paw"],
  ["food", "Food", "apple"],
  ["home", "Home", "home"],
  ["clothes", "Clothes", "shirt"],
  ["family", "Family", "users"],
  ["outside", "Outside", "sun"],
  ["actions", "Actions", "footprints"],
  ["colors", "Colors & descriptions", "palette"],
].map(([slug, name, icon], i) => ({
  id: slug,
  slug,
  name,
  icon,
  sortOrder: i,
}));
// Authored content: no translation service or phrase generation runs in a child's session.
// Columns: slug | category | EN word / level 2 / level 3 / sentence | DE equivalents.
const rows = `car|vehicles|Car/Red car/Big red car/The car is moving.|Auto/Rotes Auto/Großes rotes Auto/Das Auto fährt.
truck|vehicles|Truck/Big truck/Big yellow truck/The truck is moving.|Lastwagen/Großer Lastwagen/Großer gelber Lastwagen/Der Lastwagen fährt.
bus|vehicles|Bus/Big bus/Big blue bus/The bus is coming.|Bus/Großer Bus/Großer blauer Bus/Der Bus kommt.
train|vehicles|Train/Long train/Long red train/The train is moving.|Zug/Langer Zug/Langer roter Zug/Der Zug fährt.
excavator|vehicles|Excavator/Yellow excavator/Big yellow excavator/The excavator is digging.|Bagger/Gelber Bagger/Großer gelber Bagger/Der Bagger gräbt.
police-car|vehicles|Police car/Blue police car/Big blue police car/The police car is coming.|Polizeiauto/Blaues Polizeiauto/Großes blaues Polizeiauto/Das Polizeiauto kommt.
fire-truck|vehicles|Fire truck/Red fire truck/Big red fire truck/The fire truck is coming.|Feuerwehrauto/Rotes Feuerwehrauto/Großes rotes Feuerwehrauto/Die Feuerwehr kommt.
ambulance|vehicles|Ambulance/White ambulance/Big white ambulance/The ambulance is coming.|Krankenwagen/Weißer Krankenwagen/Großer weißer Krankenwagen/Der Krankenwagen kommt.
bicycle|vehicles|Bicycle/Blue bicycle/My blue bicycle/I ride my bicycle.|Fahrrad/Blaues Fahrrad/Mein blaues Fahrrad/Ich fahre Fahrrad.
motorcycle|vehicles|Motorcycle/Red motorcycle/Big red motorcycle/The motorcycle is moving.|Motorrad/Rotes Motorrad/Großes rotes Motorrad/Das Motorrad fährt.
airplane|vehicles|Airplane/White airplane/Big white airplane/The airplane is flying.|Flugzeug/Weißes Flugzeug/Großes weißes Flugzeug/Das Flugzeug fliegt.
boat|vehicles|Boat/Small boat/Small blue boat/The boat is on the water.|Boot/Kleines Boot/Kleines blaues Boot/Das Boot schwimmt.
dog|animals|Dog/Big dog/Big brown dog/The dog is running.|Hund/Großer Hund/Großer brauner Hund/Der Hund läuft.
cat|animals|Cat/Small cat/Small white cat/The cat is sleeping.|Katze/Kleine Katze/Kleine weiße Katze/Die Katze schläft.
bird|animals|Bird/Small bird/Small blue bird/The bird is flying.|Vogel/Kleiner Vogel/Kleiner blauer Vogel/Der Vogel fliegt.
fish|animals|Fish/Orange fish/Small orange fish/The fish is swimming.|Fisch/Oranger Fisch/Kleiner oranger Fisch/Der Fisch schwimmt.
elephant|animals|Elephant/Big elephant/Big gray elephant/The elephant is walking.|Elefant/Großer Elefant/Großer grauer Elefant/Der Elefant läuft.
tiger|animals|Tiger/Big tiger/Big orange tiger/The tiger is walking.|Tiger/Großer Tiger/Großer orangefarbener Tiger/Der Tiger läuft.
monkey|animals|Monkey/Small monkey/Small brown monkey/The monkey is climbing.|Affe/Kleiner Affe/Kleiner brauner Affe/Der Affe klettert.
cow|animals|Cow/Big cow/Big brown cow/The cow is eating.|Kuh/Große Kuh/Große braune Kuh/Die Kuh frisst.
chicken|animals|Chicken/Small chicken/Small white chicken/The chicken is walking.|Huhn/Kleines Huhn/Kleines weißes Huhn/Das Huhn läuft.
apple|food|Apple/Red apple/Big red apple/I eat an apple.|Apfel/Roter Apfel/Großer roter Apfel/Ich esse einen Apfel.
banana|food|Banana/Yellow banana/My yellow banana/I eat a banana.|Banane/Gelbe Banane/Meine gelbe Banane/Ich esse eine Banane.
rice|food|Rice/Warm rice/A bowl of rice/I eat rice.|Reis/Warmer Reis/Eine Schüssel Reis/Ich esse Reis.
bread|food|Bread/Soft bread/A piece of bread/I eat bread.|Brot/Weiches Brot/Ein Stück Brot/Ich esse Brot.
milk|food|Milk/White milk/A cup of milk/I drink milk.|Milch/Weiße Milch/Ein Becher Milch/Ich trinke Milch.
water|food|Water/Cool water/A cup of water/I drink water.|Wasser/Kühles Wasser/Ein Becher Wasser/Ich trinke Wasser.
egg|food|Egg/White egg/Small white egg/Here is an egg.|Ei/Weißes Ei/Kleines weißes Ei/Hier ist ein Ei.
orange|food|Orange/Small orange/My small orange/I eat an orange.|Orange/Kleine Orange/Meine kleine Orange/Ich esse eine Orange.
bed|home|Bed/My bed/My soft bed/I sleep in my bed.|Bett/Mein Bett/Mein weiches Bett/Ich schlafe in meinem Bett.
chair|home|Chair/Small chair/My small chair/I sit on the chair.|Stuhl/Kleiner Stuhl/Mein kleiner Stuhl/Ich sitze auf dem Stuhl.
table|home|Table/Big table/Big brown table/The cup is on the table.|Tisch/Großer Tisch/Großer brauner Tisch/Der Becher steht auf dem Tisch.
door|home|Door/Open door/Big open door/The door is open.|Tür/Offene Tür/Große offene Tür/Die Tür ist offen.
light|home|Light/Bright light/A bright light/The light is on.|Lampe/Helle Lampe/Eine helle Lampe/Die Lampe leuchtet.
cup|home|Cup/Blue cup/My blue cup/Here is my cup.|Becher/Blauer Becher/Mein blauer Becher/Hier ist mein Becher.
spoon|home|Spoon/Small spoon/My small spoon/I hold the spoon.|Löffel/Kleiner Löffel/Mein kleiner Löffel/Ich halte den Löffel.
plate|home|Plate/White plate/My white plate/The apple is on the plate.|Teller/Weißer Teller/Mein weißer Teller/Der Apfel liegt auf dem Teller.
shirt|clothes|Shirt/Blue shirt/My blue shirt/I put on my shirt.|Shirt/Blaues Shirt/Mein blaues Shirt/Ich ziehe mein Shirt an.
pants|clothes|Pants/Green pants/My green pants/I put on my pants.|Hose/Grüne Hose/Meine grüne Hose/Ich ziehe meine Hose an.
shoes|clothes|Shoes/My shoes/My red shoes/I put on my shoes.|Schuhe/Meine Schuhe/Meine roten Schuhe/Ich ziehe meine Schuhe an.
socks|clothes|Socks/Soft socks/My soft socks/I put on my socks.|Socken/Weiche Socken/Meine weichen Socken/Ich ziehe meine Socken an.
hat|clothes|Hat/Red hat/My red hat/I put on my hat.|Hut/Roter Hut/Mein roter Hut/Ich setze meinen Hut auf.
eat|actions|Eat/Eat rice/I eat rice/I am eating rice.|Essen/Reis essen/Ich esse Reis/Ich esse jetzt Reis.
drink|actions|Drink/Drink water/I drink water/I am drinking water.|Trinken/Wasser trinken/Ich trinke Wasser/Ich trinke jetzt Wasser.
run|actions|Run/Run fast/I run fast/The dog is running.|Laufen/Schnell laufen/Ich laufe schnell/Der Hund läuft.
walk|actions|Walk/Walk slowly/I walk slowly/We are walking together.|Gehen/Langsam gehen/Ich gehe langsam/Wir gehen zusammen.
jump|actions|Jump/Jump up/I jump up/I can jump.|Springen/Hoch springen/Ich springe hoch/Ich kann springen.
sleep|actions|Sleep/Sleep well/The cat sleeps/The cat is sleeping.|Schlafen/Gut schlafen/Die Katze schläft/Die Katze schläft jetzt.
sit|actions|Sit/Sit down/I sit down/I sit on my chair.|Sitzen/Hinsetzen/Ich setze mich/Ich sitze auf meinem Stuhl.
stand|actions|Stand/Stand up/I stand up/I am standing here.|Stehen/Aufstehen/Ich stehe auf/Ich stehe hier.
open|actions|Open/Open door/Open the door/I open the door.|Öffnen/Tür öffnen/Die Tür öffnen/Ich öffne die Tür.
close|actions|Close/Close door/Close the door/I close the door.|Schließen/Tür schließen/Die Tür schließen/Ich schließe die Tür.
wash|actions|Wash/Wash hands/Wash my hands/I wash my hands.|Waschen/Hände waschen/Meine Hände waschen/Ich wasche meine Hände.
drive|actions|Drive/Drive car/Drive the car/The car is moving.|Fahren/Auto fahren/Mit dem Auto fahren/Das Auto fährt.
red|colors|Red/Red car/Big red car/The car is red.|Rot/Rotes Auto/Großes rotes Auto/Das Auto ist rot.
blue|colors|Blue/Blue cup/My blue cup/My cup is blue.|Blau/Blauer Becher/Mein blauer Becher/Mein Becher ist blau.
green|colors|Green/Green bus/Big green bus/The bus is green.|Grün/Grüner Bus/Großer grüner Bus/Der Bus ist grün.
yellow|colors|Yellow/Yellow truck/Big yellow truck/The truck is yellow.|Gelb/Gelber Lastwagen/Großer gelber Lastwagen/Der Lastwagen ist gelb.
black|colors|Black/Black cat/Small black cat/The cat is black.|Schwarz/Schwarze Katze/Kleine schwarze Katze/Die Katze ist schwarz.
white|colors|White/White dog/Big white dog/The dog is white.|Weiß/Weißer Hund/Großer weißer Hund/Der Hund ist weiß.
big|colors|Big/Big truck/Big yellow truck/The truck is big.|Groß/Großer Lastwagen/Großer gelber Lastwagen/Der Lastwagen ist groß.
small|colors|Small/Small car/Small red car/The car is small.|Klein/Kleines Auto/Kleines rotes Auto/Das Auto ist klein.
fast|colors|Fast/Fast car/Fast red car/The car is fast.|Schnell/Schnelles Auto/Schnelles rotes Auto/Das Auto ist schnell.
slow|colors|Slow/Slow turtle/Small slow turtle/The turtle is slow.|Langsam/Langsame Schildkröte/Kleine langsame Schildkröte/Die Schildkröte ist langsam.
hot|colors|Hot/Hot soup/A bowl of hot soup/The soup is hot.|Heiß/Heiße Suppe/Eine Schüssel heiße Suppe/Die Suppe ist heiß.
cold|colors|Cold/Cold water/A cup of cold water/The water is cold.|Kalt/Kaltes Wasser/Ein Becher kaltes Wasser/Das Wasser ist kalt.
happy|colors|Happy/Happy dog/Big happy dog/The dog is happy.|Fröhlich/Fröhlicher Hund/Großer fröhlicher Hund/Der Hund ist fröhlich.
sad|colors|Sad/Sad teddy/My sad teddy/Teddy needs a hug.|Traurig/Trauriger Teddy/Mein trauriger Teddy/Teddy braucht eine Umarmung.
mama|family|Mama/My mama/My lovely mama/Mama is here.|Mama/Meine Mama/Meine liebe Mama/Mama ist hier.
papa|family|Papa/My papa/My lovely papa/Papa is here.|Papa/Mein Papa/Mein lieber Papa/Papa ist hier.
tree|outside|Tree/Big tree/Big green tree/I can see a tree.|Baum/Großer Baum/Großer grüner Baum/Ich sehe einen Baum.
sun|outside|Sun/Bright sun/The bright sun/The sun is shining.|Sonne/Helle Sonne/Die helle Sonne/Die Sonne scheint.
flower|outside|Flower/Red flower/Small red flower/I can see a flower.|Blume/Rote Blume/Kleine rote Blume/Ich sehe eine Blume.`;
export const concepts: Concept[] = rows.split("\n").map((row) => {
  const [slug, category, en, de] = row.split("|");
  const translate = (language: "EN" | "DE", value: string): Translation => {
    const [word, phraseLevel2, phraseLevel3, sentence] = value.split("/");
    return {
      language,
      word,
      phraseLevel2,
      phraseLevel3,
      sentence,
      promptText: language === "EN" ? "What can you see?" : "Was siehst du?",
    };
  };
  const my = burmese[slug];
  return {
    id: slug,
    slug,
    categoryId: category,
    imageUrl: `/images/${category}/${slug}.svg`,
    type:
      category === "actions"
        ? "ACTION"
        : category === "colors"
          ? ["red", "blue", "green", "yellow", "black", "white"].includes(slug)
            ? "COLOR"
            : "DESCRIPTION"
          : category === "family"
            ? "PERSON"
            : "OBJECT",
    difficulty: 1,
    active: true,
    translations: [
      translate("EN", en),
      translate("DE", de),
      {
        language: "MY",
        word: my?.[0] ?? "ပုံကို ကြည့်ပါ",
        phraseLevel2: my?.[1] ?? my?.[0] ?? "ပုံကို ကြည့်ပါ",
        phraseLevel3: my?.[2] ?? my?.[0] ?? "ပုံကို ကြည့်ပါ",
        sentence: my?.[3] ?? my?.[0] ?? "ပုံကို ကြည့်ပါ",
        promptText: "ဒါ ဘာလဲ။",
        needsReview: true,
      },
    ],
  };
});
export const knownSlugs = [
  "car",
  "truck",
  "police-car",
  "excavator",
  "red",
  "blue",
  "green",
  "yellow",
];

export const learningSlugs = ["bus", "dog", "run", "cup", "banana"];
