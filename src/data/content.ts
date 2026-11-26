// All page content in Russian and English. The facts (prices, sets, events, photos and films in /public/media)
// come from the club's own content pack (HOTLAND-site, sixth version); nothing here comes from another club.
// The words were rewritten on 2026-11-11 in the club's own voice (since 2026-11-19 the club calls itself a premium
// gentlemen's club, not a cabaret, and speaks of membership, not VIP): theatre rather than a strip
// club, never compared with another venue by name. Plain enough to read at a glance, with a wink.
// Dates, prices, inclusions and the address are PLACEHOLDERS until the club confirms them.
import type { L } from './i18n';

/** A file in /public/media. */
export const media = (file: string) => `/media/${file}`;

type Shot = { img: string; alt: L; loop?: string };

/* ---------- Manifesto and house rules ---------- */

export const manifesto = {
  title: { ru: 'Город остаётся за дверью', en: 'The city stays outside' } as L,
  text: { ru: 'Внутри сцена, ужин и бар до утра. Телефоны в чехлах, в зале не снимают. Остальное между нами.', en: 'Inside: the stage, dinner and the bar until morning. Phones stay sealed and nobody films. The rest is between us.' } as L,
  shot: { img: 'manifesto.webp', loop: 'manifesto-loop.mp4', alt: { ru: 'Портрет в кружевной маске, полоса багрового света', en: 'A portrait in a lace mask, a stripe of crimson light' } } as Shot,
};

export const houseRulesTitle: L = { ru: 'Правила дома', en: 'House rules' };
export const houseRules: L[] = [
  { ru: 'Телефон остаётся у входа в запечатанном чехле до конца вечера.', en: 'Your phone stays at the door, sealed in a pouch, until you leave.' },
  { ru: 'Фото и видео в зале запрещены. Без исключений.', en: 'No photos or video inside. No exceptions.' },
  { ru: 'Личный менеджер встречает у двери и ведёт вас весь вечер.', en: 'A personal manager meets you at the door and looks after you all night.' },
  { ru: 'Вход строго 18+, с паспортом. Дресс-код: элегантно, без\u00a0спортивного. Кроме адидасов.', en: 'Strictly 18+, with ID. Dress code: smart, no sportswear. Adidas excepted.' },
];

/* ---------- One night in four acts ---------- */

export type Act = { time: string; title: L; text: L; img: string; imgPhone: string; film: string; filmPhone: string; alt: L };

export const night = {
  title: { ru: 'Ночь в\u00a0четырёх актах', en: 'A\u00a0night in\u00a0four acts' } as L, // (three words to the Dial: a preposition, an article, holds to its word)
  lead: { ru: 'Двери открываются в 22:00. Потом ужин, два шоу и бар до утра. Антракт можно взять когда угодно.', en: 'Doors open at 22:00. Then dinner, two shows and the bar until morning. Take an interval whenever you like.' } as L,
  acts: [
    {
      time: '22:00',
      title: { ru: 'Двери и ужин', en: 'Doors and dinner' },
      text: { ru: 'Менеджер встречает у двери и провожает к столу. Вечер начинается с ужина.', en: 'Your manager meets you at the door and sees you to your table. The evening starts with dinner.' },
      img: 'night-1-2200-doors.webp', imgPhone: 'night-1-2200-doors-phone.webp', film: 'night-1-2200-doors.mp4', filmPhone: 'night-1-2200-doors-phone.mp4',
      alt: { ru: 'Хостес в чёрном атласе распахивает двери клуба и с улыбкой приглашает внутрь', en: 'A hostess in black satin opens the club doors and invites you in with a smile' },
    },
    {
      time: '23:30',
      title: { ru: 'Первое шоу', en: 'The first show' },
      text: { ru: 'Гаснет свет, открывается занавес. Шоу-балет, бурлеск, акробатика под потолком и живой голос.', en: 'The lights go down and the curtain opens. The dance show, burlesque, aerial work under the ceiling and live vocals.' },
      img: 'night-2-2330-first-show.webp', imgPhone: 'night-2-2330-first-show-phone.webp', film: 'night-2-2330-first-show.mp4', filmPhone: 'night-2-2330-first-show-phone.mp4',
      alt: { ru: 'Первое шоу: артистка в кристаллах делает шаг к залу, за ней раскрываются чёрные веера из перьев', en: 'The first show: an artist in crystals steps towards the room as black feather fans open behind her' },
    },
    {
      time: '01:30',
      title: { ru: 'Второе шоу', en: 'The second show' },
      text: { ru: 'Другая программа для тех, кто остался. Свет ниже, номера смелее.', en: 'A different programme for those who stay. Lower light, bolder acts.' },
      img: 'night-3-0130-second-show.webp', imgPhone: 'night-3-0130-second-show-phone.webp', film: 'night-3-0130-second-show.mp4', filmPhone: 'night-3-0130-second-show-phone.mp4',
      alt: { ru: 'Второе шоу: артистка в кристаллах на краю сцены у пилона смотрит в камеру', en: 'The second show: an artist in crystals on the edge of the stage by the pole looks into the camera' },
    },
    {
      time: '06:00',
      title: { ru: 'До утра', en: 'Until morning' },
      text: { ru: 'Караоке, отдельные кабинеты и бар до закрытия. Машину вызовем мы.', en: 'Karaoke, the private rooms and the bar until closing. We will call your car.' },
      img: 'night-4-0600-till-morning.webp', imgPhone: 'night-4-0600-till-morning-phone.webp', film: 'night-4-0600-till-morning.mp4', filmPhone: 'night-4-0600-till-morning-phone.mp4',
      alt: { ru: 'До утра: девушка в пайетках у бара, туфли в одной руке, шампанское в другой, за окном рассвет', en: 'Till morning: a woman in sequins at the bar, heels in one hand and champagne in the other, dawn in the window' },
    },
  ] as Act[],
};

/* ---------- The show: six acts ---------- */

export const cast = {
  title: { ru: 'Ради этого шоу остаются', en: 'The show people stay for' } as L,
  // (no head count of artists: the casting call on the same pages says the club is casting its first company)
  lead: { ru: 'Двадцать номеров на одной сцене: балет, бурлеск, акробатика, пилон и живой голос.', en: 'Twenty acts on one stage: ballet, burlesque, aerial, pole and live vocals.' } as L,
};

export type ShowAct = { title: L; text: L } & Shot;

export const acts: ShowAct[] = [
  { title: { ru: 'Пилон', en: 'Pole' }, text: { ru: 'Номер на серебряном пилоне в центре зала. Ни одного лишнего движения.', en: 'On the silver pole in the middle of the room. Not one wasted move.' }, img: 'artist-1-pole.webp', loop: 'artist-1-pole-loop.mp4', alt: { ru: 'Артистка в чёрном бархатном боди у серебряного пилона', en: 'An artist in a black velvet bodysuit at the silver pole' } },
  { title: { ru: 'Шоу-балет', en: 'Dance show' }, text: { ru: 'Хореография и костюмы большого театра, только ближе. Каждую ночь в 23:30 и 01:30.', en: 'The choreography and costumes of a grand theatre, only closer. Every night at 23:30 and 01:30.' }, img: 'artist-4-show-ballet.webp', loop: 'artist-4-show-ballet-loop.mp4', alt: { ru: 'Шоу-балет: артистка в чёрном уборе из перьев и багровой накидке', en: 'Show ballet: an artist in a black feather headdress and a crimson cape' } },
  { title: { ru: 'Бурлеск', en: 'Burlesque' }, text: { ru: 'Перья и длинные перчатки. Классика жанра.', en: 'Feathers and long gloves. A classic.' }, img: 'artist-2-burlesque.webp', loop: 'artist-2-burlesque-loop.mp4', alt: { ru: 'Бурлеск: чёрный веер из перьев закрывает лицо, длинные серебряные перчатки', en: 'Burlesque: a black feather fan hides the face, long silver gloves' } },
  { title: { ru: 'Живой вокал', en: 'Live vocals' }, text: { ru: 'Джаз и соул между номерами. Песню можно заказать и посвятить кому угодно.', en: 'Jazz and soul between the acts. Request a song and dedicate it to anyone you like.' }, img: 'artist-5-live-vocal.webp', loop: 'artist-5-live-vocal-loop.mp4', alt: { ru: 'Живой вокал: винтажный серебряный микрофон в руке в атласной перчатке, дым', en: 'Live vocals: a vintage silver microphone in a satin-gloved hand, smoke' } },
  { title: { ru: 'Акробатика', en: 'Aerial' }, text: { ru: 'Кольцо под самым потолком. Зал замолкает.', en: 'A hoop right under the ceiling. The room goes quiet.' }, img: 'artist-3-aerial.webp', loop: 'artist-3-aerial-loop.mp4', alt: { ru: 'Артистка в багровом на воздушном кольце высоко над сценой', en: 'An artist in crimson on an aerial hoop high above the stage' } },
  { title: { ru: 'Дуэты', en: 'Duets' }, text: { ru: 'Двое в одном луче света. Самый смелый номер программы.', en: 'Two in one beam of light. The boldest act of the night.' }, img: 'artist-6-duets.webp', loop: 'artist-6-duets-loop.mp4', alt: { ru: 'Дуэт: два силуэта спина к спине в узком луче белого света', en: 'A duet: two silhouettes back to back in a narrow beam of white light' } },
];

/* ---------- Gallery: twelve more nights ---------- */

export const galleryTitle: L = { ru: 'Галерея', en: 'Gallery' };

export const gallery: (Shot & { ratio: string })[] = [
  { img: 'gallery-01-velvet-wall.webp', ratio: '2/3', alt: { ru: 'Артистка в чёрном боди с кристаллами у бархатной стены', en: 'An artist in a black crystal bodysuit by a velvet wall' } },
  { img: 'gallery-02-backstage-mirror.webp', ratio: '3/4', alt: { ru: 'За кулисами: артистка красит губы у зеркала с лампами', en: 'Backstage: an artist puts on lipstick at a mirror lined with bulbs' } },
  { img: 'gallery-03-vip-sofa.webp', ratio: '3/4', alt: { ru: 'Отдельный кабинет: девушка в атласном платье на багровом бархатном диване', en: 'A private room: a woman in a satin dress on a crimson velvet sofa' } },
  { img: 'gallery-04-pole-spin.webp', ratio: '2/3', alt: { ru: 'Артистка на пилоне в движении, волосы в полёте, багровый свет', en: 'An artist spinning on the pole, hair flying, crimson light' } },
  { img: 'gallery-05-three-fans.webp', ratio: '16/9', alt: { ru: 'Шоу-балет: три артистки с веерами из перьев на сцене', en: 'Show ballet: three artists with feather fans on stage' } },
  { img: 'gallery-06-light-stripe.webp', ratio: '3/4', alt: { ru: 'Портрет: полоса багрового света на глазах', en: 'Portrait: a stripe of crimson light across the eyes' } },
  { img: 'gallery-07-glove-champagne.webp', ratio: '1/1', alt: { ru: 'Рука в атласной перчатке с браслетом держит бокал шампанского', en: 'A gloved hand with a crystal bracelet holding a coupe of champagne' } },
  { img: 'gallery-08-hostess-door.webp', ratio: '2/3', alt: { ru: 'Хостес в платье-смокинге у входа, бархатный канат', en: 'The hostess in a tuxedo dress at the door by the velvet rope' } },
  { img: 'gallery-09-singer.webp', ratio: '3/4', alt: { ru: 'Певица в платье с пайетками у винтажного микрофона', en: 'A singer in a sequin gown at a vintage microphone' } },
  { img: 'gallery-10-aerial-silks.webp', ratio: '3/4', alt: { ru: 'Воздушная гимнастка на багровых полотнах над сценой', en: 'An aerialist on crimson silks high above the stage' } },
  { img: 'gallery-11-champagne-tower.webp', ratio: '16/9', alt: { ru: 'Башня из бокалов шампанского у мраморной стойки', en: 'A champagne tower at the marble bar' } },
  { img: 'gallery-12-staircase.webp', ratio: '2/3', alt: { ru: 'Девушка в длинном чёрном платье на винтовой лестнице', en: 'A woman in a long black gown on the spiral staircase' } },
];
/** A gallery picture by its number (1–12). */
export const g = (n: number) => gallery[n - 1];

/* ---------- Events ---------- */

export const eventsLead: L = { ru: 'Особые вечера только по\u00a0брони. Выберите вечер, и\u00a0менеджер подтвердит ваш стол.', en: 'Special nights are by reservation only. Choose a night and your manager will confirm your table.' };

/** Each night's poster shows its photograph, img (with its alt), and plays its short film, loop, over it
 *  (PosterCard.astro; since 2026-11-23 again, after two days of posters set in type alone).
 *  zoom and drop: how much closer the poster frames its photo and film, and how far it lowers them (% of the poster's
 *  height; the black at the top of the shot fades into the poster; a negative drop raises them), so the girl stands as
 *  big and as low as on the other posters. Courchevel's shot is wider than the rest, with her face high up.
 *  pos: which part of a photo taller than the poster shows (CSS object-position, photo and film alike; the posters
 *  show the top of the shot unless told otherwise), for a girl who stands lower in her photo than the others do. */
export type Event = { slug: string; date: string; title: L; text: L; entry: number; dress?: L; zoom?: number; drop?: number; pos?: string } & Shot & { loop: string };

export const events: Event[] = [
  // the coming nights (placeholders until the club confirms them; moved from November to December on 2026-11-14)
  {
    slug: 'courchevel', date: '2026-12-11', entry: 3000, zoom: 1.2, drop: 18,
    title: { ru: 'Courchevel', en: 'Courchevel' },
    text: { ru: 'Альпийская ночь: белый мех и ледяное шампанское до утра.', en: 'An Alpine night: white fur and iced champagne until morning.' },
    img: 'poster-2-courchevel.webp', loop: 'poster-2-courchevel-loop.mp4',
    alt: { ru: 'Courchevel: блондинка в белом меху и кристаллах, бокал шампанского, падает снег', en: 'Courchevel: a blonde in white fur and crystals, a glass of champagne, falling snow' },
  },
  {
    slug: 'velvet', date: '2026-12-12', entry: 3000,
    title: { ru: 'Velvet', en: 'Velvet' },
    text: { ru: 'Бархат и красный свет. Дресс-код: красная деталь.', en: 'Velvet and red light. Dress code: a touch of red.' },
    dress: { ru: 'Красный', en: 'Red' },
    img: 'poster-1-velvet.webp', loop: 'poster-1-velvet-loop.mp4',
    alt: { ru: 'Velvet: артистка в бархатном корсете и длинных перчатках на фоне багрового занавеса', en: 'Velvet: an artist in a velvet corset and opera gloves before a crimson curtain' },
  },
  {
    slug: 'ritual', date: '2026-12-13', entry: 3500,
    title: { ru: 'Ritual', en: 'Ritual' },
    text: { ru: 'Фирменная ночь HOTLAND: свечи и маски. О ней потом не рассказывают.', en: 'HOTLAND’s signature night: candles and masks. Nobody talks about it afterwards.' },
    img: 'poster-3-ritual.webp', loop: 'poster-3-ritual-loop.mp4',
    alt: { ru: 'Ritual: девушка в кружевной маске среди чёрных свечей и багрового воска', en: 'Ritual: a woman in a lace mask among black candles and crimson wax' },
  },
];

/** Nights that have been (the events page shows them under the coming ones, smaller and in black and white, each
 *  leading to the gallery). PLACEHOLDERS, like the coming nights, until the club sends its own. */
export const pastEvents: (Omit<Event, 'loop'> & { loop?: string })[] = [
  {
    slug: 'silver', date: '2026-11-07', entry: 3000,
    title: { ru: 'Silver', en: 'Silver' },
    text: { ru: 'Серебро, блёстки и шампанское: ночь, когда сверкал весь зал.', en: 'Silver, sequins and champagne: the night the whole room sparkled.' },
    img: 'poster-4-new-year.webp', loop: 'poster-4-new-year-loop.mp4',
    alt: { ru: 'Silver: артистка в серебряном платье с бокалом шампанского, вокруг летят блёстки', en: 'Silver: an artist in a silver dress with a glass of champagne, sequins flying' },
  },
  {
    slug: 'neon', date: '2026-10-31', entry: 3000, zoom: 1.15, drop: -14, pos: '50% 100%',
    title: { ru: 'Neon', en: 'Neon' },
    text: { ru: 'Неон, цилиндры и перья: Хеллоуин по\u2011нашему.', en: 'Neon, top hats and feathers: Halloween, our way.' },
    img: 'gallery-14-top-hat.webp',
    alt: { ru: 'Neon: артистка в цилиндре и розовых рукавах под неоновым кольцом', en: 'Neon: an artist in a top hat and pink sleeves under a neon ring' },
  },
  {
    slug: 'pink', date: '2026-10-24', entry: 3000,
    title: { ru: 'Pink', en: 'Pink' },
    text: { ru: 'Розовое шампанское башней и красные перчатки. Самая сладкая ночь осени.', en: 'Pink champagne in a tower and red satin gloves. The sweetest night of the autumn.' },
    img: 'gallery-15-pink-champagne.webp',
    alt: { ru: 'Pink: башня из бокалов с розовым шампанским, рука в красной атласной перчатке', en: 'Pink: a tower of glasses of pink champagne, a hand in a red satin glove' },
  },
  {
    slug: 'blue', date: '2026-10-17', entry: 3000, zoom: 1.6, drop: -17,
    title: { ru: 'Blue', en: 'Blue' },
    text: { ru: 'Синий свет и живой джаз: грустил в ту ночь только саксофон.', en: 'Blue light and live jazz: only the saxophone had the blues.' },
    img: 'gallery-22-teal-singer.webp',
    alt: { ru: 'Blue: певица в чёрном платье с блёстками у микрофона в бирюзовых лучах, за ней артистки', en: 'Blue: a singer in a glittering black gown at the microphone in teal beams, artists behind her' },
  },
];

/* ---------- Membership: three cards, five zones (the object keeps its old name, vip) ---------- */

export const vip = {
  title: { ru: 'Членство <em>в клубе</em>', en: 'Club <em>membership</em>' } as L,
  lead: { ru: 'Три карты клуба: стол в зале, ложа у сцены или отдельный кабинет. Выберите карту, остальное сделает менеджер.', en: 'Three club cards: a table in the main room, a booth by the stage or a private room. Choose a card; your manager arranges the rest.' } as L,
  request: { ru: 'Запросить карту', en: 'Request a card' } as L,
};

/** The three cards. Their names read like the age on a bottle (the approved «Между» board: Silver, Black and Bordeaux
 *  became Выдержка 12, 18 and 25); the finishes stay as they were (MemberCards.astro: cloth, steel, nappa). */
export const tiers: { name: L; sub: L; items: L[] }[] = [
  { name: { ru: 'Выдержка 12', en: 'Aged 12' }, sub: { ru: 'Стол в зале', en: 'A table in the main room' }, items: [{ ru: 'Бутылка на выбор и закуски', en: 'A bottle of your choice and snacks' }, { ru: 'Места с видом на сцену', en: 'Seats facing the stage' }, { ru: 'Встреча у двери', en: 'Met at the door' }] },
  { name: { ru: 'Выдержка 18', en: 'Aged 18' }, sub: { ru: 'Ложа у сцены', en: 'A booth by the stage' }, items: [{ ru: 'Ужин-сет на каждого гостя', en: 'A dinner set for every guest' }, { ru: 'Две бутылки на выбор', en: 'Two bottles of your choice' }, { ru: 'Номер у вашей ложи', en: 'A performance at your booth' }] },
  { name: { ru: 'Выдержка 25', en: 'Aged 25' }, sub: { ru: 'Отдельный кабинет на всю ночь', en: 'A private room for the whole night' }, items: [{ ru: 'Ужин от шефа и шампанское без ограничений', en: 'Chef’s dinner and unlimited champagne' }, { ru: 'Своё шоу в вашем кабинете', en: 'A show of your own in your room' }, { ru: 'Личный менеджер на весь вечер', en: 'Your own manager for the whole night' }] },
];

/** The club's zones (the membership page). `book`: the booking form's choice that a zone's link opens with; `cta`: that link's
 *  words, naming what you book (a zone may be a room, not a table). */
export const zones: ({ title: L; text: L; book: 'table' | 'card' | 'lounge'; cta: L } & Shot)[] = [
  { book: 'table', cta: { ru: 'Забронировать', en: 'Book' }, title: { ru: 'Стол в зале', en: 'A table in the main room' }, text: { ru: 'Главный зал. Вся сцена перед вами.', en: 'The main room. The whole stage in front of you.' }, img: 'gallery-05-three-fans.webp', alt: { ru: 'Шоу-балет: три артистки с веерами из перьев на сцене', en: 'Show ballet: three artists with feather fans on stage' } },
  { book: 'table', cta: { ru: 'Забронировать', en: 'Book' }, title: { ru: 'Ложа у сцены', en: 'A booth by the stage' }, text: { ru: 'Ближе к сцене только артистки.', en: 'Only the artists are closer to the stage.' }, img: 'night-3-0130-second-show.webp', alt: { ru: 'Артистка в кристаллах на краю сцены у пилона', en: 'An artist in crystals on the edge of the stage by the pole' } },
  { book: 'card', cta: { ru: 'Забронировать', en: 'Book' }, title: { ru: 'Отдельный кабинет', en: 'A private room' }, text: { ru: 'Дверь закрыта. Вечер ваш.', en: 'The door is closed. The evening is yours.' }, img: 'gallery-03-vip-sofa.webp', alt: { ru: 'Отдельный кабинет: девушка в атласном платье на бархатном диване', en: 'A private room: a woman in a satin dress on a velvet sofa' } },
  { book: 'card', cta: { ru: 'Забронировать', en: 'Book' }, title: { ru: 'Караоке-зал', en: 'A karaoke room' }, text: { ru: 'Зал только для вашей компании. Плейлист ваш.', en: 'A room for your company only. The playlist is yours.' }, img: 'gallery-09-singer.webp', alt: { ru: 'Певица в платье с пайетками у винтажного микрофона', en: 'A singer in a sequin gown at a vintage microphone' } },
  { book: 'lounge', cta: { ru: 'Забронировать', en: 'Book' }, title: { ru: 'Кальянная', en: 'The hookah lounge' }, text: { ru: 'Диваны и кальян между двумя шоу.', en: 'Sofas and a hookah between the two shows.' }, img: 'hookah-lounge.webp', loop: 'hookah-lounge-loop.mp4', alt: { ru: 'Кальянный лаунж: девушка в чёрном атласе выдыхает дым на бархатном диване', en: 'Hookah lounge: a woman in black satin exhales smoke on a velvet banquette' } },
];

/* ---------- Parties ---------- */

export const parties = {
  title: { ru: 'Ваш праздник, <em>ваш\u00a0сценарий</em>', en: 'Your party, <em>your\u00a0script</em>' } as L, // (two lines in the Dial, as «Ваш стол уже ждёт»)
  lead: { ru: 'Повод ваш, остальное на нас: банкет, напитки, шоу-программа и менеджер от первого звонка до машины домой.', en: 'The occasion is yours, the rest is ours: the banquet, the drinks, the show and a manager from the first call to the car home.' } as L,
  included: [
    { ru: 'Банкетное меню нашей кухни', en: 'A banquet menu from our kitchen' },
    { ru: 'Напитки пакетом, без счёта за каждый бокал', en: 'Drinks as a package, no bill for every glass' },
    { ru: 'Шоу-программа под ваш повод', en: 'A show made for your occasion' },
    { ru: 'Личный менеджер от первого звонка до машины домой', en: 'Your own manager, from the first call to the car home' },
  ] as L[],
  cta: { ru: 'Оставить заявку', en: 'Enquire' } as L,
};

/** A picture on an occasion's page; `pos`, which part of it a frame of another shape keeps (CSS object-position). */
export type OccasionShot = Shot & { pos?: string };
/** An occasion. `img`: its own picture (its panel among the parties, the band under its page's title). `scene`: the
 *  picture beside what comes with a party, on its page. `more`: three more for its page, framed 4:3, 1:1 and 3:4. */
export type Occasion = { slug: 'birthday' | 'bachelor' | 'corporate' | 'hire'; title: L; text: L; scene: OccasionShot; more: OccasionShot[] } & Shot;

export const occasions: Occasion[] = [
  {
    slug: 'birthday', title: { ru: 'День рождения', en: 'Birthday' },
    text: { ru: 'Торт выносят на сцену, артистки поздравляют виновника. Музыку выбираете вы.', en: 'The cake comes out on stage and the artists toast the guest of honour. You choose the music.' },
    img: 'party-1-birthday.webp', alt: { ru: 'День рождения: шоколадный торт с одной бенгальской свечой на чёрном мраморе', en: 'Birthday: a dark chocolate cake with one sparkler on black marble' },
    scene: { img: 'gallery-07-glove-champagne.webp', pos: '50% 30%', alt: { ru: 'Рука в атласной перчатке поднимает бокал шампанского', en: 'A satin-gloved hand raising a coupe of champagne' } },
    more: [
      { img: 'gallery-23-eclipse.webp', alt: { ru: 'Сцена: три танцовщицы в круге белого света', en: 'The stage: three dancers in a disc of white light' } },
      { img: 'set-3-crimson.webp', alt: { ru: 'Магнум шампанского с бенгальским огнём в чаше со льдом', en: 'A magnum of champagne with a sparkler in a bowl of ice' } },
      { img: 'gallery-09-singer.webp', alt: { ru: 'Певица в платье с пайетками у винтажного микрофона', en: 'A singer in a sequin gown at a vintage microphone' } },
    ],
  },
  {
    slug: 'bachelor', title: { ru: 'Мальчишник', en: 'Bachelor party' },
    text: { ru: 'Отдельный кабинет и программа для жениха, в конце машина до дома. Без телефонов и фотографий.', en: 'A private room and a programme for the groom, then a car home. No phones, no photographs.' },
    img: 'party-2-bachelor.webp', alt: { ru: 'Мальчишник: мужские руки в чёрных костюмах чокаются бокалами для виски', en: 'Bachelor party: hands in black suits raising crystal whisky tumblers' },
    scene: { img: 'party-2-whisky.webp', pos: '50% 56%', alt: { ru: 'Бокал виски и дым сигары на тёмном столе', en: 'A glass of whisky and cigar smoke on a dark table' } },
    more: [
      { img: 'gallery-11-champagne-tower.webp', alt: { ru: 'Башня из бокалов шампанского у стойки бара', en: 'A champagne tower at the bar' } },
      { img: 'set-1-classic.webp', alt: { ru: 'Водка во льду в чёрном ведре, рядом банки энергетика', en: 'Vodka on ice in a black bucket, cans of energy drink beside it' } },
      { img: 'gallery-21-flame-bar.webp', pos: '50% 40%', alt: { ru: 'Бармен поджигает коктейль у стойки', en: 'The barman sets a cocktail alight at the bar' } },
    ],
  },
  {
    slug: 'corporate', title: { ru: 'Корпоратив', en: 'Corporate night' },
    text: { ru: 'Закрытый зал, банкет и шоу-программа для команды. Один счёт на компанию.', en: 'A room closed to other guests, a banquet and a show for your team. One invoice for the company.' },
    img: 'party-3-corporate.webp', alt: { ru: 'Корпоратив: длинный банкетный стол, серебро, хрусталь, бархатные кресла', en: 'Corporate night: a long banquet table, silver, crystal, velvet chairs' },
    scene: { img: 'gallery-20-laser-hall.webp', alt: { ru: 'Главный зал во время шоу: лазеры, круглые сцены, люстры', en: 'The main room during the show: lasers, round stages, chandeliers' } },
    more: [
      { img: 'gallery-11-champagne-tower.webp', alt: { ru: 'Башня из бокалов шампанского у стойки бара', en: 'A champagne tower at the bar' } },
      { img: 'set-2-premier.webp', alt: { ru: 'Бутылка водки во льду в светящейся ладье', en: 'A bottle of vodka on ice in a glowing boat' } },
      { img: 'gallery-22-teal-singer.webp', alt: { ru: 'Певица у микрофона в лучах прожекторов, за ней артистки', en: 'A singer at the microphone in the spotlights, artists behind her' } },
    ],
  },
  {
    slug: 'hire', title: { ru: 'Клуб целиком', en: 'The whole club' },
    text: { ru: 'Весь HOTLAND только для ваших гостей: сцена, бар, отдельные кабинеты и своя программа. Для остальных в этот вечер закрыто.', en: 'All of HOTLAND for your guests only: the stage, the bar, the private rooms and a programme of your own. Closed to everyone else that night.' },
    img: 'party-4-whole-club.webp', alt: { ru: 'Клуб целиком: пустая сцена, бархатный занавес, один луч', en: 'The whole club: an empty stage, a velvet curtain, one spotlight' },
    scene: { img: 'gallery-23-eclipse.webp', alt: { ru: 'Сцена: три танцовщицы в круге белого света', en: 'The stage: three dancers in a disc of white light' } },
    more: [
      { img: 'gallery-11-champagne-tower.webp', alt: { ru: 'Башня из бокалов шампанского у стойки бара', en: 'A champagne tower at the bar' } },
      { img: 'gallery-08-hostess-door.webp', pos: '50% 34%', alt: { ru: 'Хостес в платье-смокинге у двери, бархатный канат', en: 'The hostess in a tuxedo dress at the door, a velvet rope' } },
      { img: 'gallery-10-aerial-silks.webp', alt: { ru: 'Воздушная гимнастка на полотнах высоко над сценой', en: 'An aerialist on silks high above the stage' } },
    ],
  },
];

/* ---------- Bar menu ---------- */

/** A line of the menu: its name, a volume, a few words under it, the price (null: on request; `from`: «от»), and
 *  `own` for the club's own (the house cocktails), which the menu marks in steel. */
export type Item = { name: L; vol?: L; desc?: L; price: number | null; from?: boolean; own?: boolean };
const it = (ru: string, en: string, price: number | null, extra: Partial<Item> = {}): Item => ({ name: { ru, en }, price, ...extra });
const vol = (ru: string): L => ({ ru: ru.replace(' ', '\u00a0'), en: ru.replace(',', '.').replace(' л', ' l').replace(' мл', ' ml') });
const d = (ru: string, en: string): L => ({ ru, en });

export const barMenu = {
  title: { ru: 'Меню', en: 'Menu' } as L,
  /** the menu page's second line under its name, as every page header has (may contain <em>) */
  sub: { ru: 'Бар и кухня <em>до&nbsp;утра</em>', en: 'The bar and the kitchen <em>until morning</em>' } as L,
  /** the page's description, for search and for a shared link */
  lead: { ru: 'Бар и кухня HOTLAND до утра: виски, коктейли, шампанское и ужин. Цены на вход и шоу-программу.', en: 'The HOTLAND bar and kitchen, open until morning: whisky, cocktails, champagne and dinner. Entry and show prices.' } as L,
  /** the menu page's lead, under its name and second line */
  intro: { ru: 'Виски и коктейли, шампанское, ужин за вашим столом. Здесь же цены на вход и шоу-программу.', en: 'Whisky and cocktails, champagne, dinner at your table. Entry and show prices are here too.' } as L,
  note: { ru: 'Цены в рублях, обслуживание включено.', en: 'Prices in roubles, service included.' } as L,
  onRequest: { ru: 'по запросу', en: 'on request' } as L,
  tabs: { bar: { ru: 'Бар', en: 'Bar' } as L, kitchen: { ru: 'Кухня', en: 'Kitchen' } as L, entry: { ru: 'Вход и шоу', en: 'Entry & shows' } as L },
  /** each tab's photograph (2026-11-22: the club's rooms and tables, in place of the artist on the bar, at the table
   *  and at the pole); `pos`, where its subject stands, so a frame of another shape keeps it */
  shots: {
    bar: { img: 'party-2-whisky.webp', pos: '50% 56%', alt: { ru: 'Виски в хрустальном роксе, рядом сигара и тонкий дым', en: 'Whisky in a crystal rocks glass, a cigar beside it and a thread of smoke' } },
    kitchen: { img: 'party-3-corporate.webp', pos: '50% 50%', alt: { ru: 'Длинный стол накрыт к ужину: свечи в канделябрах, серебро, хрусталь', en: 'A long table laid for dinner: candelabras, silver, crystal' } },
    entry: { img: 'gallery-23-eclipse.webp', pos: '64% 50%', alt: { ru: 'Шоу-программа: три силуэта на сцене в круге белого света', en: 'The show: three dancers in silhouette in a disc of white light' } },
  } as Record<'bar' | 'kitchen' | 'entry', Shot & { pos: string }>,
};

/** The bar's list, in the order a gentlemen's bar prints it: the spirits first, whisky at their head, then the
 *  house's own cocktails and the classics (each of the two groups from the dearest down), champagne and wine by the
 *  glass and the bottle, beer, and what has no alcohol. (2026-11-22: it opened on beer.) */
export const bar: { title: L; items: Item[] }[] = [
  { title: { ru: 'Крепкое', en: 'Spirits' }, items: [
    it('Виски', 'Whisky', 900, { vol: vol('50 мл'), from: true }),
    it('Текила', 'Tequila', 800, { vol: vol('50 мл') }),
    it('Ром', 'Rum', 750, { vol: vol('50 мл') }),
    it('Водка премиум', 'Premium vodka', 600, { vol: vol('50 мл') }),
  ] },
  { title: { ru: 'Коктейли', en: 'Cocktails' }, items: [
    it('Just Between Us', 'Just Between Us', 1500, { desc: d('Бурбон, вишня, дым', 'Bourbon, cherry, smoke'), own: true }),
    it('Stargazer', 'Stargazer', 1400, { desc: d('Джин, личи, роза', 'Gin, lychee, rose'), own: true }),
    it('Эспрессо мартини', 'Espresso martini', 1300),
    it('Негрони', 'Negroni', 1200),
    it('Апероль шприц', 'Aperol spritz', 1200),
    it('Мохито', 'Mojito', 1100),
  ] },
  { title: { ru: 'Шампанское и вино', en: 'Champagne & wine' }, items: [
    it('Шампанское, бокал', 'Champagne, glass', 1900, { vol: vol('125 мл') }),
    it('Шампанское, бутылка', 'Champagne, bottle', 18000, { vol: vol('0,75 л'), from: true }),
    it('Вино, бокал', 'Wine, glass', 950, { vol: vol('150 мл'), from: true }),
    it('Вино, бутылка', 'Wine, bottle', 6500, { vol: vol('0,75 л'), from: true }),
  ] },
  { title: { ru: 'Пиво', en: 'Beer' }, items: [
    it('Светлое разливное', 'Draught lager', 650, { vol: vol('0,5 л') }),
    it('Тёмное разливное', 'Draught dark', 690, { vol: vol('0,5 л') }),
    it('Пшеничное', 'Wheat beer', 720, { vol: vol('0,5 л') }),
    it('Лагер в бутылке', 'Bottled lager', 750, { vol: vol('0,33 л') }),
    it('Сидр', 'Cider', 690, { vol: vol('0,33 л') }),
    it('Безалкогольное', 'Alcohol-free beer', 550, { vol: vol('0,33 л') }),
  ] },
  { title: { ru: 'Без алкоголя', en: 'Soft drinks' }, items: [
    it('Энергетик', 'Energy drink', 600, { vol: vol('0,25 л') }),
    it('Кола, тоник, спрайт', 'Cola, tonic, lemonade', 450, { vol: vol('0,25 л') }),
    it('Сок', 'Juice', 450, { vol: vol('0,25 л') }),
  ] },
  { title: { ru: 'Вода, кофе и чай', en: 'Water, coffee & tea' }, items: [
    it('Вода', 'Water', 400, { vol: vol('0,5 л') }),
    it('Эспрессо', 'Espresso', 350),
    it('Чай, чайник', 'Tea, pot', 600),
  ] },
];

export const kitchen: Item[] = [
  it('Тартар из говядины', 'Beef tartare', 1400, { desc: d('Вяленый желток, бриошь', 'Cured yolk, brioche') }),
  it('Устрицы, 6\u00a0шт.', 'Six oysters', 2900, { desc: d('Шалот, лимон, мигнонет', 'Shallot, lemon, mignonette') }),
  it('Карпаччо из сибаса', 'Sea bass carpaccio', 1300, { desc: d('Цитрус, оливковое масло, укроп', 'Citrus, olive oil, dill') }),
  it('Хачапури по-аджарски', 'Adjarian khachapuri', 1200, { desc: d('С трюфелем, на компанию', 'With truffle, to share') }),
  it('Стейк рибай, 300\u00a0г', 'Ribeye steak, 300\u00a0g', 4900, { desc: d('Перечный соус, печёный картофель', 'Pepper sauce, baked potato') }),
  it('Сырная тарелка', 'Cheese board', 1900, { desc: d('Европейские и фермерские сыры, мёд', 'European and farm cheeses, honey') }),
  it('«Красный бархат»', 'Red Velvet', 900, { desc: d('Фирменный десерт клуба', 'The club’s own dessert') }),
  it('Фрукты на льду', 'Fruit on ice', 2500, { desc: d('Сезонные, на серебряном блюде', 'Seasonal, on a silver platter') }),
];

/** The club's cards in one line, as the membership page names them (`tiers`): «Выдержка 12, 18 и 25». The word
 *  every name starts with is said once. */
const cardNames = (lang: keyof L) => {
  const names = tiers.map((t) => t.name[lang]);
  const head = names[0].split(' ')[0] + ' ';
  const parts = names.length > 1 && names.every((n) => n.startsWith(head)) ? names.map((n, i) => (i ? n.slice(head.length) : n)) : names;
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')}${lang === 'ru' ? ' и ' : ' and '}${parts[parts.length - 1]}` : parts.join('');
};

export const entryShows: Item[] = [
  it('Вход', 'Entry', 1000, { desc: d('Каждый вечер, кроме особых', 'Every night except special nights') }),
  it('Особый вечер', 'Special night', 3000, { from: true, desc: d('Courchevel, Velvet, Ritual: даты в Афише', 'Courchevel, Velvet, Ritual: dates in Events') }),
  it('Номер у вашего стола', 'A performance at your table', 5000, { from: true, desc: d('Длительность и место согласует менеджер', 'Length and place agreed with your manager') }),
  it('Членство и караоке', 'Membership & karaoke', null, { desc: d(`Карты клуба: ${cardNames('ru')}`, `Club cards: ${cardNames('en')}`) }),
];

/* ---------- Bottle sets ---------- */

export const sets = {
  title: { ru: 'Сеты <em>для стола</em>', en: 'Bottle <em>sets</em>' } as L,
  lead: { ru: 'Бутылка, лёд и миксеры к вашему столу. Два старших сета выносят с огнём.', en: 'A bottle, ice and mixers for your table. The two larger sets come out on fire.' } as L,
  cta: { ru: 'Заказать сет', en: 'Order this set' } as L,
  items: [
    { name: { ru: 'Классика', en: 'Classic' }, what: { ru: 'Водка премиум 0,7 л, шесть энергетиков, лёд и лимон', en: 'Premium vodka 0.7 l, six energy drinks, ice and lemon' }, perks: [{ ru: 'Номер артистки у вашего стола', en: 'A performance at your table' }, { ru: '10 купюр HOTLAND, чтобы благодарить артисток', en: '10 HOTLAND notes to thank the artists with' }], price: 25000, img: 'set-1-classic.webp', alt: { ru: 'Сет «Классика»: водка во льду в чёрном ведре, рядом банки энергетика', en: 'The Classic set: vodka on ice in a black bucket, cans of energy drink beside it' } },
    { name: { ru: 'Премьер', en: 'Premier' }, what: { ru: 'Водка 1 л, девять энергетиков, фруктовая тарелка', en: 'Vodka 1 l, nine energy drinks, a fruit platter' }, perks: [{ ru: 'Два номера у вашего стола', en: 'Two performances at your table' }, { ru: '20 купюр HOTLAND, чтобы благодарить артисток', en: '20 HOTLAND notes to thank the artists with' }, { ru: 'Выносим с огнём', en: 'Brought out on fire' }], price: 45000, img: 'set-2-premier.webp', alt: { ru: 'Сет «Премьер»: бутылка водки во льду в светящейся ладье и девять банок энергетика', en: 'The Premier set: a bottle of vodka on ice in a glowing boat and nine cans of energy drink' } },
    { name: { ru: 'Bordeaux', en: 'Bordeaux' }, what: { ru: 'Шампанское 1,5 л и водка 1 л, двенадцать миксеров, икра и фрукты', en: 'Champagne 1.5 l and vodka 1 l, twelve mixers, caviar and fruit' }, perks: [{ ru: 'Своё шоу в отдельном кабинете', en: 'A show of your own in a private room' }, { ru: '50 купюр HOTLAND, чтобы благодарить артисток', en: '50 HOTLAND notes to thank the artists with' }, { ru: 'Выносим с огнём под вашу музыку', en: 'Brought out on fire, to your music' }], price: 95000, img: 'set-3-crimson.webp', loop: 'set-3-crimson-loop.mp4', alt: { ru: 'Сет Bordeaux: магнум шампанского с бенгальским огнём в чаше со льдом', en: 'The Bordeaux set: a magnum of champagne with a sparkler in a bowl of ice' } },
  ] as ({ name: L; what: L; perks: L[]; price: number } & Shot)[],
};

/* ---------- Hookah lounge ---------- */

export const hookah = {
  title: { ru: 'Кальянная', en: 'Hookah lounge' } as L,
  lead: { ru: 'Отдельный зал с диванами и мягким светом. Сюда уходят между двумя шоу.', en: 'A room of its own, with sofas and low light, for the hour between the two shows.' } as L,
  flavorsTitle: { ru: 'Вкусы', en: 'Flavours' } as L,
  flavors: [
    { ru: 'Клубника со сливками', en: 'Strawberry and cream' },
    { ru: 'Мята со льдом', en: 'Iced mint' },
    { ru: 'Двойное яблоко', en: 'Double apple' },
    { ru: 'Вишня и ваниль', en: 'Cherry and vanilla' },
    { ru: 'Личи и роза', en: 'Lychee and rose' },
    { ru: 'Лесные ягоды', en: 'Wild berries' },
  ] as L[],
  offers: [
    it('Кальян', 'Hookah', 4500, { desc: d('Любой вкус, на всю компанию', 'Any flavour, for the whole table') }),
    it('Артистка за вашим столом', 'An artist at your table', 12000, { desc: d('Час беседы, кальян за счёт клуба', 'An hour’s conversation; the hookah is on the house') }),
  ],
  cta: { ru: 'Забронировать кальянную', en: 'Book the lounge' } as L,
  shot: zones[4] as Shot,
};

/* ---------- Visit ---------- */

export const visit = {
  title: { ru: 'Как нас <em>найти</em>', en: 'Finding <em>us</em>' } as L,
  rows: [
    { k: { ru: 'Часы', en: 'Hours' }, v: { ru: '22:00–06:00, каждую ночь', en: '22:00–06:00, every night' } },
    { k: { ru: 'Шоу', en: 'Shows' }, v: { ru: '23:30 и 01:30', en: '23:30 and 01:30' } },
    { k: { ru: 'Дресс-код', en: 'Dress code' }, v: { ru: 'Элегантно, без\u00a0спортивного. Кроме адидасов', en: 'Smart, no sportswear. Adidas excepted' } },
    { k: { ru: 'Вход', en: 'Entry' }, v: { ru: 'Строго 18+, с паспортом', en: 'Strictly 18+, with ID' } },
  ] as { k: L; v: L }[],
  shot: { img: 'contacts-door.webp', loop: 'contacts-door-loop.mp4', alt: { ru: 'Вход в клуб: чёрная дверь, бархатный канат, снег на мокрой брусчатке', en: 'The way in: a black door, a velvet rope, snow on wet cobbles' } } as Shot,
};

/* ---------- Careers ---------- */

export const careers = {
  title: { ru: 'Собираем <em>первый состав</em>', en: 'Hiring <em>the\u00a0first team</em>' } as L,
  lead: { ru: 'HOTLAND открывается, и мы собираем команду: артисток, хостес, бар и зал. Расскажите о себе, портфолио пригодится.', en: 'HOTLAND is opening, and we are hiring the first team: artists, hostesses, the bar and the floor. Tell us about yourself; a portfolio helps.' } as L,
  roles: [
    { ru: 'Артистки шоу', en: 'Show artists' },
    { ru: 'Хостес', en: 'Hostesses' },
    { ru: 'Официанты', en: 'Waiters' },
    { ru: 'Бармены', en: 'Bartenders' },
    { ru: 'Менеджеры зала', en: 'Floor managers' },
  ] as L[],
  cta: { ru: 'Telegram', en: 'Telegram' } as L,
  shot: { img: 'careers.webp', alt: { ru: 'Гримёрка: зеркало в лампах, багровая помада, серебряный гребень, веер из перьев, в зеркале никого', en: 'Dressing room: a bulb-lit mirror, crimson lipstick, a silver comb, a feather fan; the mirror is empty' } } as Shot,
};

/* ---------- Closing ---------- */

export const closing = {
  title: { ru: 'Ваш стол <em>уже ждёт</em>', en: 'Your table <em>is waiting</em>' } as L,
  text: { ru: 'Каждую ночь с 22:00. Менеджер подтвердит бронь, остальное останется между нами.', en: 'Every night from 22:00. Your manager confirms the booking; the rest stays between us.' } as L,
};

/* ---------- Booking ---------- */

export const bookingFine: L = { ru: 'Депозит и минимальный счёт назовёт менеджер, когда подтвердит бронь.', en: 'Your manager will tell you the deposit and minimum spend when confirming.' };

export const bookingTypes: { id: string; label: L }[] = [
  { id: 'table', label: { ru: 'Стол', en: 'Table' } },
  { id: 'card', label: { ru: 'Карта клуба', en: 'Club card' } },
  { id: 'lounge', label: { ru: 'Кальянная', en: 'Hookah lounge' } },
  { id: 'event', label: { ru: 'Праздник', en: 'A party' } },
  { id: 'ticket', label: { ru: 'Особый вечер', en: 'Special night' } },
];
