export interface Club {
  name: string;
  room: string;
  schedule: string;
  formUrl?: string;
}

export const SCHOOL_CLUBS: Club[] = [
  {
    name: 'Amine Club',
    room: '1-201',
    schedule: 'Meets Monday at 2:30 PM - 4:00 PM',
  },
  {
    name: 'Art Club',
    room: '1-114',
    schedule: 'Meets Tuesday at 2:30 PM - 3:30 PM',
  },
  {
    name: 'Board Game Club',
    room: '1-113',
    schedule: 'Meets Wednesday at 2:30 PM - 3:45 PM',
  },
  {
    name: 'Book Club',
    room: '1-115',
    schedule: 'Meets Every first Monday of every month at 2:30 PM - 4:00 PM',
  },
  {
    name: 'Chem Lab Crew',
    room: '1-221',
    schedule: 'Meets Thursday at 2:30 PM - 3:45 PM',
  },
  {
    name: 'Chess Club',
    room: '2-111',
    schedule: 'Meets Monday at 2:30 PM - 3:30 PM',
  },
  {
    name: 'Club SWAG',
    room: '1-211',
    schedule: 'Meets Wednesday at After school',
  },
  {
    name: 'Cinema Club',
    room: '1-209',
    schedule: 'Meets Friday at 2:30 PM - 4:30 PM',
  },
  {
    name: 'Computer Science',
    room: '1-224',
    schedule: 'Meets Tuesday at 2:30 PM - 3:30 PM',
  },
  {
    name: 'DnD Club',
    room: '1-132',
    schedule: 'Meets Mondays at 2:30 PM - 4:30 PM',
  },
  {
    name: 'eSports',
    room: '1-212',
    schedule: 'Meets Fridays at 2:30 PM - 4:00 PM',
  },
  {
    name: 'H.E.A.L',
    room: '1-126',
    schedule: 'Meets Twice a month at 2:40 PM - 4:00 PM',
  },
  {
    name: 'Paleontology Club',
    room: '1-232',
    schedule: 'Meets Tuesdays at 2:30 PM - 3:30 PM',
  },
  {
    name: 'Pride Panthers',
    room: '1-113',
    schedule: 'Meets Fridays at 2:20 PM - 3:45 PM',
  },
  {
    name: 'Robotics',
    room: '1-113',
    schedule: 'Meets Thursday at 2:30 PM - 4:00 PM',
  },
  { name: 'Spanish Club', room: '1-209', schedule: 'Meets Friday at' },
];

export const WEEKLY_CALENDAR = {
  monday: 'Amine Club (2:30 PM - 4:00 PM), Chess Club (2:30 PM - 3:30 PM)',
  tuesday: 'Art Club (2:30 PM - 3:30 PM), Computer Science (2:30 PM - 3:30 PM)',
  wednesday: 'Board Game Club (2:30 PM - 3:45 PM), Club SWAG (After school)',
  thursday: 'Chem Lab Crew (2:30 PM - 3:45 PM), Robotics (2:30 PM - 4:00 PM)',
  friday: 'Cinema Club (2:30 PM - 4:30 PM), Spanish Club ()',
};
