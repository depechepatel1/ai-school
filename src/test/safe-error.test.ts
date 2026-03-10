import { describe, it, expect } from "vitest";
import { getSafeErrorMessage } from "@/lib/safe-error";

describe("getSafeErrorMessage", () => {
  it("maps known Supabase errors to friendly messages", () => {
    expect(getSafeErrorMessage("Invalid login credentials")).not.toBe("Invalid login credentials");
    expect(getSafeErrorMessage("Invalid login credentials")).toContain("email");
  });

  it("returns a generic message for unknown errors", () => {
    const result = getSafeErrorMessage("some_internal_db_error_xyz_12345");
    expect(result).toBeTruthy();
    expect(result.length).toBeGreaterThan(5);
  });

  it("handles empty string", () => {
    const result = getSafeErrorMessage("");
    expect(result).toBeTruthy();
  });
});
