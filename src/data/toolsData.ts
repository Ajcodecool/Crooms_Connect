export interface Tool {
  name: string;
  icon: string;
  description?: string;
  id?: string;
  url?: string;
}
export interface ToolCategory {
  id: string;
  title: string;
  description: string;
  items: Tool[];
}

export const TOOL_CATEGORIES: ToolCategory[] = [
  {
    id: 'study',
    title: 'Study Tools',
    description: 'Ace your exams with these resources',
    items: [
      {
        id: 'interactive-timer',
        name: 'Focus Timer',
        icon: '/stopwatch-solid-full.svg',
        description: 'Start a study session',
      },
      {
        name: 'Crooms Bell Schedule',
        icon: 'https://www.google.com/s2/favicons?domain=croomssched.tech&sz=128',
        url: 'https://croomssched.tech/',
      },
      {
        name: 'Knowt',
        icon: 'https://www.google.com/s2/favicons?domain=knowt.com&sz=128',
        url: 'https://knowt.com/',
      },
      {
        name: 'CollegeBoard',
        icon: 'https://www.google.com/s2/favicons?domain=collegeboard.org&sz=128',
        url: 'https://apcentral.collegeboard.org/',
      },
      {
        name: 'Past AP Questions',
        icon: 'https://www.google.com/s2/favicons?domain=collegeboard.org&sz=128',
        url: 'https://apcentral.collegeboard.org/courses/ap-computer-science-a/exam/past-exam-questions',
      },
      {
        name: 'FAST / Sample Tests',
        icon: 'https://www.google.com/s2/favicons?domain=cambiumtds.com&sz=128',
        url: 'https://login8.cambiumtds.com/student_core/V281/Pages/LoginShell.aspx?c=Florida_PT&a=Student',
      },
      {
        name: 'Citation Generator',
        icon: 'https://www.google.com/s2/favicons?domain=mybib.com&sz=128',
        url: 'https://www.mybib.com/tools/apa-citation-generator',
      },
      {
        name: 'Turbo AI Notes',
        icon: 'https://www.google.com/s2/favicons?domain=turbo.ai&sz=128',
        url: 'https://www.turbo.ai/',
      },
      {
        name: 'Study Strategies (PDF)',
        icon: 'https://www.google.com/s2/favicons?domain=cgc.edu&sz=128',
        url: 'https://www.cgc.edu/sites/default/files/inline-files/List%20of%20Comprehensive%20Study%20Strategies%20by%20Topic_102025.pdf',
      },
      {
        name: 'Khan Academy',
        icon: 'https://www.google.com/s2/favicons?domain=khanacademy.org&sz=128',
        url: 'https://www.khanacademy.org/',
      },
      {
        name: 'WolframAlpha',
        icon: 'https://www.google.com/s2/favicons?domain=wolframalpha.com&sz=128',
        url: 'https://www.wolframalpha.com/',
      },
      {
        name: 'Desmos',
        icon: 'https://www.google.com/s2/favicons?domain=desmos.com&sz=128',
        url: 'https://www.desmos.com/calculator',
      },
    ],
  },
  {
    id: 'toys',
    title: 'Toys',
    description: 'Relax',
    items: [
      {
        name: 'Wordle',
        icon: 'https://www.google.com/s2/favicons?domain=nytimes.com&sz=128',
        url: 'https://www.nytimes.com/games/wordle/index.html',
      },
      {
        name: '2048',
        icon: 'https://www.google.com/s2/favicons?domain=play2048.co&sz=128',
        url: 'https://play2048.co/',
      },
      {
        name: 'Neal.fun',
        icon: 'https://www.google.com/s2/favicons?domain=neal.fun&sz=128',
        url: 'https://neal.fun/',
      },
      {
        name: 'CP Journey',
        icon: 'https://www.google.com/s2/favicons?domain=cpjourney.net&sz=128',
        url: 'https://www.cpjourney.net/',
      },
      {
        name: 'Google Dino Game',
        icon: 'https://www.google.com/s2/favicons?domain=dinogame.net&sz=128',
        url: 'https://mathadventure1.github.io/dinomath',
      },
      {
        name: 'CoffeeTrail',
        icon: 'https://www.google.com/s2/favicons?domain=coffee.com&sz=128',
        url: 'https://datnerdashley.github.io/CoffeeTrail/',
      },
       {
        name: 'voxiom.io',
        icon: 'https://www.google.com/s2/favicons?domain=coffee.com&sz=128',
        url: 'https://voxiom.io/',
      },
       {
        name: 'Mario Teaches Typing',
        icon: 'https://www.google.com/s2/favicons?domain=coffee.com&sz=128',
        url: 'https://www.retrogames.cz/play_1254-DOS.php',
      },
       {
        name: 'Google Games',
        icon: 'https://www.google.com/s2/favicons?domain=coffee.com&sz=128',
        url: 'https://sites.google.com/site/populardoodlegames/home',
      },
       {
       name: 'Google Game halloween doodle',
        icon: 'https://www.google.com/s2/favicons?domain=coffee.com&sz=128',
        url: 'https://doodles.google/doodle/halloween-2016/',
      },
      {
        name: 'Kanye Zone',
        icon: 'https://www.google.com/s2/favicons?domain=kanyezone.com&sz=128',
        url: 'http://www.kanyezone.com/',
      },
    ],
  },
  {
    id: 'misc',
    title: 'Misc',
    description: 'Useful utilities and apps',
    items: [
      {
        name: 'Ai Test Maker',
        icon: 'https://www.google.com/s2/favicons?domain=minitoolai.com&sz=128',
        url: 'https://minitoolai.com/ai-test-generator/',
      },
      {
        name: 'Grade Calculator',
        icon: 'https://www.google.com/s2/favicons?domain=calculator.net&sz=128',
        url: 'https://www.calculator.net/grade-calculator.html',
      },
      {
        name: 'Saturn App',
        icon: 'https://www.google.com/s2/favicons?domain=joinsaturn.com&sz=128',
        url: 'https://www.joinsaturn.com/',
      },
      {
        name: 'studygenie',
        icon: 'https://www.google.com/s2/favicons?domain=dinogame.net&sz=12',
        url: 'https://app.studygenie.io/',
      },
      {
        name: 'YouTube Video transcriber',
        icon: 'https://www.google.com/s2/favicons?domain=www.youtranscripts.com&sz=128',
        url: 'https://www.youtranscripts.com/',
      },
      {
        name: 'Speedtest',
        icon: 'https://www.google.com/s2/favicons?domain=speedtest.net&sz=128',
        url: 'https://www.speedtest.net/',
      },
    ],
  },
];
