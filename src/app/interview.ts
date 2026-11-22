/* Interview practice for people who stutter. Questions, stuttering-management techniques,
   self-disclosure openers, and small helpers. Content preserved. */
export const QUESTIONS = [
  "Tell me about yourself.", "Why do you want this job?", "Why should we hire you?", "What are your strengths?",
  "What is one weakness you are working on?", "Describe a problem you solved at work or college.", "Where do you see yourself in five years?",
  "Tell me about a time you worked in a team.", "How do you handle pressure or deadlines?", "Why are you leaving your current job?",
  "What do you know about our company?", "Tell me about a time you made a mistake and what you learned.", "How would your friends or colleagues describe you?",
  "What are your salary expectations?", "Do you have any questions for us?"
];

export const TECHS = ["Easy onset", "Light contact", "Pausing and phrasing", "Voluntary stuttering", "Cancellation or pull-out", "Kept eye contact", "Disclosed stuttering", "Did not avoid words"];

export const STATEMENTS: ((name: string) => string)[] = [
  n => `${n ? `I'm ${n}. ` : ""}Before we start, I'd like to mention that I stutter. Sometimes it takes me a little longer to say a word, so thank you for your patience.`,
  n => `${n ? `Hello, I'm ${n}. ` : ""}Just so you know, I stutter. If I take a moment on a word, please wait rather than finishing it for me. It doesn't affect my work.`,
  n => `${n ? `Hi, I'm ${n}. ` : ""}You'll probably notice I stutter. I'm comfortable with it, and I've learned to communicate well with clients and colleagues. Let's get started.`
];

export interface Attempt { id?: string; date: string; q: string; secs: number; anx: number; avoid: number; said: number; techs: number[]; note: string }

/** Draw a question, avoiding the last few that were practised. */
export function pickQuestion(recent: string[], rand: () => number = Math.random): string {
  const used = new Set(recent.slice(-8));
  const pool = QUESTIONS.filter(q => !used.has(q));
  const src = pool.length ? pool : QUESTIONS;
  return src[Math.floor(rand() * src.length)];
}

export const mmss = (s: number): string => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const THINK_SECONDS = 30;
export const ANSWER_SECONDS = 90;
