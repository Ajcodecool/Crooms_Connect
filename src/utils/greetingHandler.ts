export const getGreeting = (): string => {
  // === 0. LUCKY LOGIC (0.001% Chance) ===
  if (Math.random() < 0.00001) {
    return "🍀 You are the 1 in 100,000! Go to Badges and search 'lucky' to claim your prize.";
  }

  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const hour = now.getHours();
  const minutes = now.getMinutes();

  const currentTimeInMinutes = hour * 60 + minutes;

  const isWeekend = day === 0 || day === 6;
  const isMonday = day === 1;
  const isFriday = day === 5;

  // --- WEEKEND LOGIC ---
  if (isWeekend) {
    const weekendMessages = [
      'No school today. Go back to sleep',
      'Touching grass is recommended',
      "Don't you dare check your grades",
      "It's the weekend. Relax.",
      "This time tomorrow still won't be school",
      'Weekends were invented for procrastinating',
      'Your alarm clock is unemployed today',
      'Sleep schedule = destroyed',
      'Enjoy freedom while it lasts',
      'Homework can wait',
      'Saturday energy',
      "Sunday already? That's illegal",
      'Go outside. The sun exists',
      "This is the only time school can't hurt you",
    ];

    return getRandom(weekendMessages);
  }

  // --- WEEKDAY LOGIC ---

  // 12:00 AM – 5:30 AM (Ultra Late)
  if (currentTimeInMinutes < 330) {
    const ultraLateMessages = [
      'Why are you still awake',
      'This is a bad decision',
      'Nothing good happens after midnight',
      'Your sleep schedule is in danger',
      'You will regret this tomorrow',
      'Go to sleep bro',
      'The sun is going to see this',
      'Your alarm clock is watching',
      'Sleep is optional apparently',
      isMonday ? "It's technically Monday now. Sorry." : null,
    ].filter((s) => s !== null);

    return getRandom(ultraLateMessages);
  }

  // 5:30 AM – 7:20 AM (Early Morning)
  if (currentTimeInMinutes < 440) {
    const earlyMessages = [
      'Why are you awake right now?',
      'The early bird gets the exhaustion',
      'Did you even sleep?',
      'Caffeine is required',
      'This should be illegal',
      'Morning people are suspicious',
      'The sun just woke up too',
      'School starts way too early',
      'Your bed misses you',
      isMonday ? 'Monday already??? Unacceptable' : null,
    ].filter((s) => s !== null);

    return getRandom(earlyMessages);
  }

  // 7:20 AM – 9:30 AM (Early Classes)
  if (currentTimeInMinutes < 570) {
    const earlyClassMessages = [
      'Lock in. You got this',
      "Pretend like you're paying attention",
      "You're physically here. That's enough",
      'First period survival mode',
      "Coffee hasn't kicked in yet",
      'Eyes open. Brain optional',
      'Attendance matters',
      "The day just started and we're tired",
      'Stay strong soldier',
      isMonday ? 'Monday morning is a crime' : null,
    ].filter((s) => s !== null);

    return getRandom(earlyClassMessages);
  }

  // 9:30 AM – 11:00 AM (Mid Morning)
  if (currentTimeInMinutes < 660) {
    const midMorningMessages = [
      'Is it lunch time yet?',
      'Time is moving suspiciously slow',
      'Your brain is warming up',
      'You made it past first period',
      'Just survive until lunch',
      'Focus level: questionable',
      'School speedrun in progress',
      'Stay awake challenge',
      'We are approaching lunchtime',
      'Hydration reminder',
    ];

    return getRandom(midMorningMessages);
  }

  // 11:00 AM – 12:00 PM (Lunch)
  if (currentTimeInMinutes < 720) {
    const lunchMessages = [
      'Lunch time',
      'This is the best part of the day',
      'Trade snacks wisely',
      'Avoid homework talk',
      'Calories over responsibilities',
      'Refuel for the afternoon',
      'The cafeteria meta begins',
      'Protect your food',
      'Lunch = temporary happiness',
      'Peak school moment',
    ];

    return getRandom(lunchMessages);
  }

  // 12:00 PM – 2:20 PM (Afternoon Classes)
  if (currentTimeInMinutes < 860) {
    const afternoonMessages = [
      "The home stretch. Don't fall asleep",
      'Eyes on the clock',
      'Almost freedom',
      'Just a few more periods',
      'Time is moving suspiciously slow',
      'Post-lunch sleepiness detected',
      'Your brain is shutting down',
      'Stay awake challenge part 2',
      'Freedom is approaching',
      'We are almost out of here',
    ];

    return getRandom(afternoonMessages);
  }

  // 2:20 PM – 5:00 PM (After School)
  if (currentTimeInMinutes < 1020) {
    const afterSchoolMessages = [
      'Freedom! (Until tomorrow)',
      'You survived another day',
      "Homework? That's future you's problem",
      'Go home. Or to robotics. Or practice',
      'School is over',
      'Time to recharge',
      'After school activities unlocked',
      'Your backpack feels lighter now',
      'Victory achieved',
      isFriday ? "It's Friday 🎉" : null,
    ].filter((s) => s !== null);

    return getRandom(afterSchoolMessages);
  }

  // 5:00 PM – 8:30 PM (Evening)
  if (currentTimeInMinutes < 1230) {
    const eveningMessages = [
      'Actually doing homework? Proud of you',
      'Gaming time?',
      'Did you remember to eat dinner?',
      'Homework grind begins',
      'Evening productivity arc',
      'Dinner time approaching',
      'Relax for a bit',
      'Study or procrastinate',
      'You still have responsibilities',
      isFriday ? 'Friday night unlocked' : null,
    ].filter((s) => s !== null);

    return getRandom(eveningMessages);
  }

  // 8:30 PM – 10:30 PM (Night)
  if (currentTimeInMinutes < 1350) {
    const nightMessages = [
      'Homework due tomorrow?',
      'You should probably finish assignments',
      'Nighttime productivity arc',
      'Your future self will thank you',
      "Don't procrastinate too hard",
      'Study time',
      'Focus mode activated',
      'Your teachers believe in you',
      'School tomorrow exists',
    ];

    return getRandom(nightMessages);
  }

  // 10:30 PM – 12:00 AM (Late Night)
  const lateNightMessages = [
    'Go to bed. Seriously',
    'Sleep is important (unfortunately)',
    'Tomorrow you will regret this',
    'This seemed like a good idea earlier',
    'Your alarm clock is getting closer',
    'Sleep speedrun recommended',
    'Your brain needs rest',
    'Last chance to sleep early',
  ];

  return getRandom(lateNightMessages);
};

const getRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
