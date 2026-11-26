// The artists, for the home page's «Артистки»: the row of portraits (Models.astro, v1) and the spotlight stage
// (ModelsStage.astro, v2) both read them from here. STAND-INS for the presentation: the portraits are AI photographs
// (public/media/model-NN-*.webp, 3:4), and the stage names and lines are ours; swap all of it for the club's own
// artists before launch (and measure where their eyes are: `eyes`).

/** Where her eyes are in a photograph: the point between her pupils (shares of the photo's width and height, from
 *  its top left) and how tall her face is (a share of the photo's height). Measured with the face detection built
 *  into macOS (Vision's face landmarks); a new photograph needs measuring too. */
export type Eyes = { x: number; y: number; face: number };
/** How a card shows one photograph: zoomed by `z` around her eyes, which are at `x`, `y` in the photo. */
export type Shot = { z: number; x: number; y: number };
/** A card's framing: where her eyes land on the card (`ox`, `oy`, shares of its width and height), her portrait's
 *  shot (`a`) and her second photograph's (`b`). */
export type Frame = { ox: number; oy: number; a: Shot; b?: Shot };

/** Each artist: her portrait (public/media/<photo>.webp), maybe a second one that the pointer reveals
 *  (public/media/<hot>.webp, the same 3:4), her stage name, what the portrait shows (alt), two short lines, and where
 *  her eyes are in the portrait and in the second photograph (`eyes`). */
export type Artist = {
  photo: string;
  hot?: string;
  name: { ru: string; en: string };
  alt: { ru: string; en: string };
  ru: [string, string];
  en: [string, string];
  eyes: [Eyes, Eyes?];
};
export const artists: Artist[] = [
  { photo: 'model-08-red-coat', hot: 'model-08-red-coat-hot', name: { ru: 'Камилла', en: 'Camilla' }, alt: { ru: 'Артистка в длинном красном пальто с бокалом шампанского на бархатном диване', en: 'An artist in a long red coat with a glass of champagne on a velvet sofa' }, ru: ['Красное пальто.', 'Бокал шампанского.'], en: ['A red coat.', 'A glass of champagne.'], eyes: [{ x: .3885, y: .0985, face: .1037 }, { x: .3331, y: .2681, face: .0924 }] },
  { photo: 'model-14-blue-lace', hot: 'model-14-blue-lace-hot', name: { ru: 'Мальвина', en: 'Malvina' }, alt: { ru: 'Артистка с голубыми волосами и татуировками, в светлом кружеве и лаковых ботфортах, на мраморном полу', en: 'An artist with blue hair and tattoos, in pale lace and patent thigh-high boots, on a marble floor' }, ru: ['Голубые волосы.', 'Её узнают с\u00a0порога.'], en: ['Blue hair.', 'Known from the door.'], eyes: [{ x: .5214, y: .2146, face: .1477 }, { x: .5049, y: .4318, face: .1276 }] },
  { photo: 'model-10-white-fur', hot: 'model-10-white-fur-hot', name: { ru: 'Снежана', en: 'Snezhana' }, alt: { ru: 'Артистка в белой шубе, кожаной портупее и кружевных чулках, с коктейлем в руке', en: 'An artist in a white fur coat, a leather harness and lace stockings, a cocktail in her hand' }, ru: ['Белый мех.', 'Ни одного лишнего слова.'], en: ['White fur.', 'Not a word too many.'], eyes: [{ x: .4577, y: .1211, face: .1048 }, { x: .4577, y: .1238, face: .1062 }] },
  { photo: 'model-09-latex-braids', hot: 'model-09-latex-braids-hot', name: { ru: 'Злата', en: 'Zlata' }, alt: { ru: 'Блондинка с двумя косами в чёрном латексном боди и ботфортах у пилона', en: 'A blonde with two braids in a black latex bodysuit and thigh-high boots by the pole' }, ru: ['Две косы.', 'Пилон без единой ошибки.'], en: ['Two braids.', 'Not one slip on the pole.'], eyes: [{ x: .4094, y: .0806, face: .0871 }, { x: .3532, y: .1668, face: .0799 }] },
  { photo: 'model-11-platinum-pole', hot: 'model-11-platinum-pole-hot', name: { ru: 'Марлен', en: 'Marlene' }, alt: { ru: 'Артистка с платиновой стрижкой пикси, в чёрном боди и сетчатых колготках у пилона', en: 'An artist with a platinum pixie cut, in a black bodysuit and fishnets by the pole' }, ru: ['Короткая стрижка.', 'Долгий взгляд.'], en: ['Short hair.', 'Long stare.'], eyes: [{ x: .4589, y: .1221, face: .0890 }, { x: .4587, y: .4846, face: .0820 }] },
  { photo: 'model-12-foam', hot: 'model-12-foam-hot', name: { ru: 'Венера', en: 'Venus' }, alt: { ru: 'Артистка в пенной ванне, ладонь у шеи, позади бар', en: 'An artist kneeling in foam, a hand at her neck, the bar behind her' }, ru: ['Вышла из пены.', 'Обратно не торопится.'], en: ['Out of the foam.', 'In no hurry to go back.'], eyes: [{ x: .5913, y: .1726, face: .1317 }, { x: .5070, y: .2266, face: .1134 }] },
  { photo: 'model-13-goth-pole', hot: 'model-13-goth-pole-hot', name: { ru: 'Рэйвен', en: 'Raven' }, alt: { ru: 'Брюнетка в чёрном кружеве, сетчатых чулках и ботинках на платформе у пилона, смотрит через плечо', en: 'A brunette in black lace, fishnet stockings and platform boots at the pole, looking over her shoulder' }, ru: ['Тяжёлые ботинки,', 'лёгкий шпагат.'], en: ['Heavy boots,', 'effortless splits.'], eyes: [{ x: .6054, y: .1681, face: .0811 }, { x: .6445, y: .2924, face: .0861 }] },
];

// Every portrait is framed on her eyes: across the row the girls' eyes are on one line and their faces about one
// size, and her second photograph puts her eyes exactly where the first has them, her face as big, so nothing jumps
// when it shows. A card shows a photo zoomed in around her eyes, which land on the card at (ox, oy):
// card = O + z * (photo - eyes). No photo may leave a gap in its card, which sets the least zoom (on each axis,
// O <= z * eyes and 1 - O <= z * (1 - eyes)).
const EYE_LINE = 0.12; // her eyes: this share of the card's height from its top (as low as the photos allow without
// zooming in too far: Zlata's eyes are at 8% of her photo's height)
const FACE = 0.13; // her face: this share of the card's height, where the photo allows
const CENTRE = 0.5; // her eyes move this much of the way toward the card's middle (0: where the photo has them)
const ZMAX = 1.7; // never closer than this, unless the photo leaves no choice
const SLACK = 1.06; // her second face may be this much bigger before her first is brought closer to match
const least = (e: Eyes, ox: number, oy: number) => Math.max(1, ox / e.x, (1 - ox) / (1 - e.x), oy / e.y, (1 - oy) / (1 - e.y));
const shot = (e: Eyes, z: number): Shot => ({ z: +z.toFixed(4), x: e.x, y: e.y });
export function frameOf([a, b]: [Eyes, Eyes?]): Frame {
  const ox = +(a.x + CENTRE * (0.5 - a.x)).toFixed(4);
  const oy = EYE_LINE;
  let za = Math.max(Math.min(Math.max(FACE / a.face, 1), ZMAX), least(a, ox, oy));
  if (!b) return { ox, oy, a: shot(a, za) };
  let zb = Math.max((za * a.face) / b.face, least(b, ox, oy));
  // her second face would come out bigger (its photo needs more zoom to fill the card): bring the first closer
  if (zb > ((za * a.face) / b.face) * SLACK) {
    za = Math.min(ZMAX, Math.max(za, (zb * b.face) / a.face / SLACK));
    zb = Math.max((za * a.face) / b.face, least(b, ox, oy));
  }
  return { ox, oy, a: shot(a, za), b: shot(b, zb) };
}
/** Each artist's framing, in the list's order. */
export const artistFrames: Frame[] = artists.map((m) => frameOf(m.eyes));
