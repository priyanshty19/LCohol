/**
 * Hardcoded allowlist — only these 3 accounts can access SIPSTORIES.
 * Password is shared (JAMUN). Anyone else gets the denied page.
 */
export type AllowedUser = {
  email: string;
  username: string;
  displayName: string;
  dob: Date;
};

export const SHARED_PASSWORD = "JAMUN";

export const ALLOWED_USERS: AllowedUser[] = [
  {
    email: "priyansht1999@gmail.com",
    username: "priyansh",
    displayName: "Priyansh",
    dob: new Date("1999-01-01"),
  },
  {
    email: "shauryashivam38@gmail.com",
    username: "shivam",
    displayName: "Shivam",
    dob: new Date("2000-01-01"),
  },
  {
    email: "piyushdtu23@gmail.com",
    username: "piyush",
    displayName: "Piyush",
    dob: new Date("2000-01-01"),
  },
];

export function findAllowedUser(email: string): AllowedUser | undefined {
  return ALLOWED_USERS.find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}
