export interface Emoji {
  trigger: string;
  src: string;
  alt: string;
}

export const emojiList: Emoji[] = [
  // === ORIGINAL EMOJIS ===
  { trigger: ':true:', src: '/true.jpg', alt: 'True.' },
  { trigger: ':panther:', src: '/panther.png', alt: 'Crooms Panther' },
  { trigger: ':verified:', src: '/verif.png', alt: 'Verified Staff' },
  { trigger: ':tyrax:', src: '/tyrax.png', alt: 'Tyrax' },
  { trigger: ':cbsh:', src: '/cbsh.png', alt: 'Crooms Bell Schedule' },
  { trigger: ':modstard:', src: '/mustard.png', alt: 'Modstard' },
  {
    trigger: ':realverified:',
    src: '/realverified.png',
    alt: 'Verified (Real)',
  },
  { trigger: ':vibecoded:', src: '/vibecoded.png', alt: 'Vibe Coded' },
  { trigger: ':shaw:', src: '/saw.jpg', alt: 'shaw.' },

  // === NEW EMOJI ===
  {
    trigger: ':freak:',
    src: 'https://thumbs.dreamstime.com/b/emoticon-drooling-38030377.jpg',
    alt: 'Freak',
  },
  {
    trigger: ':cow:',
    src: 'https://brandettes.com/wp-content/uploads/2015/08/Covercropped.jpg',
    alt: 'Cow',
  },
  {
    trigger: ':sal:',
    src: 'https://media.tenor.com/sAZUJlvsqA8AAAAe/sal-impractical-jokers-sal-sal.png',
    alt: 'Sal',
  },

  // === LGBTQ FLAG EMOJIS ===
  {
    trigger: ':trans:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Transgender_Pride_flag.svg/330px-Transgender_Pride_flag.svg.png',
    alt: 'Trans Flag',
  },
  {
    trigger: ':pan:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Pansexuality_Pride_Flag.svg/330px-Pansexuality_Pride_Flag.svg.png',
    alt: 'Pan Flag',
  },
  {
    trigger: ':nonbinary:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Nonbinary_flag.svg/330px-Nonbinary_flag.svg.png',
    alt: 'Non-Binary Flag',
  },
  {
    trigger: ':mlm:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0a/Gay_Men_Pride_Flag.svg/500px-Gay_Men_Pride_Flag.svg.png',
    alt: 'MLM Flag',
  },
  {
    trigger: ':bi:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Bisexual_Pride_Flag.svg/330px-Bisexual_Pride_Flag.svg.png',
    alt: 'Bi Flag',
  },
  {
    trigger: ':lesbian:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Lesbian_pride_flag_2018.svg/2560px-Lesbian_pride_flag_2018.svg.png',
    alt: 'Lesbian Flag',
  },
  {
    trigger: ':ace:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Asexual_Pride_Flag.svg/330px-Asexual_Pride_Flag.svg.png',
    alt: 'Ace Flag',
  },
  {
    trigger: ':aro:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Aromantic_Pride_Flag.svg/330px-Aromantic_Pride_Flag.svg.png',
    alt: 'Aro Flag',
  },
  {
    trigger: ':progress:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/60/Intersex-inclusive_pride_flag.svg/1280px-Intersex-inclusive_pride_flag.svg.png',
    alt: 'Progress Flag',
  },
  {
    trigger: ':rainbow:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Gay_Pride_Flag.svg/500px-Gay_Pride_Flag.svg.png',
    alt: 'Rainbow Flag',
  },
  {
    trigger: ':aroace:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Aroace_flag.svg/330px-Aroace_flag.svg.png',
    alt: 'AroAce Flag',
  },
  {
    trigger: ':ally:',
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Straight_Ally_flag.svg/960px-Straight_Ally_flag.svg.png',
    alt: 'Ally Flag',
  },

  // === OTHER ===
  {
    trigger: ':plert:',
    src: 'https://api.croomsconnect.com/storage/v1/object/public/chat-uploads/0f4f49db-4665-4408-83f1-703d163506cf/1776689782475_0pssno5a4.jpeg',
    alt: 'Plert',
  },
];
