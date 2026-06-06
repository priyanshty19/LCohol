export const APP_NAME = "SIPSTORIES";
export const APP_DESCRIPTION =
  "Anonymous social platform for drinking culture, cocktail discovery, and nightlife experiences.";

export const MIN_DRINKING_AGE = 21;

export const PROHIBITION_STATES = [
  "Gujarat",
  "Bihar",
  "Mizoram",
  "Nagaland",
  "Lakshadweep",
] as const;

export const RESTRICTIVE_STATES = [
  "Kerala",
  "Tamil Nadu",
  "Andhra Pradesh",
  "Manipur",
] as const;

export const FEED_PAGE_SIZE = 20;
export const COMMENTS_PAGE_SIZE = 50;
export const DRINKS_PAGE_SIZE = 24;
export const SEARCH_PAGE_SIZE = 20;

export const MAX_POST_TITLE_LENGTH = 300;
export const MAX_POST_BODY_LENGTH = 10000;
export const MAX_COMMENT_LENGTH = 5000;
export const MAX_BIO_LENGTH = 300;
export const MAX_USERNAME_LENGTH = 30;

export const KARMA_UPVOTE = 1;
export const KARMA_DOWNVOTE = -1;

export const POST_TYPES = [
  { value: "STORY", label: "Story", emoji: "story" },
  { value: "QUESTION", label: "Question", emoji: "question" },
  { value: "REVIEW", label: "Review", emoji: "review" },
  { value: "RECOMMENDATION", label: "Recommendation", emoji: "recommendation" },
  { value: "MEME", label: "Meme", emoji: "meme" },
] as const;

export const PRICE_RANGES = [
  { value: "BUDGET", label: "Budget", description: "Under INR 500" },
  { value: "MID_RANGE", label: "Mid Range", description: "INR 500 - 2000" },
  { value: "PREMIUM", label: "Premium", description: "INR 2000 - 5000" },
  { value: "LUXURY", label: "Luxury", description: "Above INR 5000" },
] as const;

export const RESPONSIBLE_DRINKING_MESSAGE =
  "Drink responsibly. This platform is for informational and community purposes only. Alcohol consumption is subject to legal restrictions in your jurisdiction.";

export const GRIEVANCE_OFFICER = {
  name: "[To be appointed]",
  email: "grievance@sipstories.in",
  responseTime: "36 hours for government orders, 72 hours for user complaints",
};
