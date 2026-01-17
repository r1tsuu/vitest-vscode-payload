import { expect, it, describe } from "vitest";

describe("Community Tests", () => {
  it("Log current DB", async () => {
    console.log(process.env.PAYLOAD_DATABASE);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect(true).toBeTruthy();
  });
});
