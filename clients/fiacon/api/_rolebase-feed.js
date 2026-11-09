// Rolebase portal feed: role_path -> order, campaign, feed key and questions.
// Hand-maintained for the Fiacon pages (not engine-built). Roles not listed here
// only go to their Google Sheet, exactly as before.
// Feed keys are secrets: they live in Vercel env vars on this project, never in git.
// Get one from /ops order drawer -> "Copy applicant feed" (feedKey).
export default {
  'lawn-garden': {
    order: '4df4cf55-0b56-4fb6-9938-2429ae65f01e',
    campaign: 0,
    key: process.env.ROLEBASE_FEED_KEY_LAWN_GARDEN || '',
    url: 'https://www.rolebase.com.au/api/applications',
    questions: [
      { field: 'q1', label: 'Do you have permanent work rights in Australia?', dealBreaker: 'No', bestAnswer: 'Yes' },
      { field: 'q2', label: 'Years of experience in garden / grounds maintenance', bestAnswer: '5+ years' },
      { field: 'q3', label: "Do you hold a current Australian driver's licence?", dealBreaker: 'No', bestAnswer: 'Yes' },
      { field: 'q4', label: "What's your expected annual salary?" },
      { field: 'q5', label: "What's your notice period?" },
      { field: 'q6', label: 'Do you consent to a medical check if required?', dealBreaker: 'No', bestAnswer: 'Yes' },
    ],
  },
}
