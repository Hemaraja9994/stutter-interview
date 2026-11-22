import { describe, expect, it } from "vitest";
import { QUESTIONS, mmss, pickQuestion } from "./interview";

describe("pickQuestion", () => {
  it("avoids the last eight questions when it can", () => {
    const recent = QUESTIONS.slice(0, 8);
    for (let i = 0; i < 30; i++) expect(recent).not.toContain(pickQuestion(recent));
  });
  it("falls back to the full set when all are recent", () => {
    const q = pickQuestion(QUESTIONS.slice(-8));
    expect(QUESTIONS).toContain(q);
  });
  it("returns a valid question with no history", () => expect(QUESTIONS).toContain(pickQuestion([])));
});

describe("mmss", () => {
  it("formats seconds", () => { expect(mmss(90)).toBe("1:30"); expect(mmss(5)).toBe("0:05"); expect(mmss(0)).toBe("0:00"); });
});
