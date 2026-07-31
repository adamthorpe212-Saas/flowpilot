import { describe, expect, it } from "vitest";
import { mapCaptureToLeadFields } from "@/lib/voice/lead";

const AREA = ["Raheny", "Clontarf", "Dublin 5"];

describe("mapCaptureToLeadFields", () => {
  it("maps known fields and trims them", () => {
    const result = mapCaptureToLeadFields(
      {
        job_type: "  Burst pipe  ",
        location: "Raheny",
        contact_name: "John Murphy",
        preferred_time: "Today",
      },
      AREA,
    );

    expect(result.job_type).toBe("Burst pipe");
    expect(result.contact_name).toBe("John Murphy");
    expect(result.preferred_time).toBe("Today");
  });

  it("ignores keys that are not lead fields", () => {
    // The model can return anything; only known columns may be written.
    const result = mapCaptureToLeadFields(
      { job_type: "Leak", status: "booked", business_id: "somebody-else" },
      AREA,
    );

    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("business_id");
    expect(result.job_type).toBe("Leak");
  });

  it("ignores blank values rather than blanking a field", () => {
    // A later turn returning "" must not erase what an earlier turn captured.
    const result = mapCaptureToLeadFields({ job_type: "   ", location: "" }, AREA);
    expect(result).toEqual({});
  });

  it("only accepts valid urgency values", () => {
    expect(mapCaptureToLeadFields({ urgency: "HIGH" }, AREA).urgency).toBe("high");
    expect(mapCaptureToLeadFields({ urgency: " normal " }, AREA).urgency).toBe("normal");
    expect(mapCaptureToLeadFields({ urgency: "extremely" }, AREA)).not.toHaveProperty(
      "urgency",
    );
  });

  it("flags a location outside the service area", () => {
    expect(mapCaptureToLeadFields({ location: "Cork" }, AREA).out_of_area).toBe(true);
  });

  it("does not flag a location inside the service area", () => {
    expect(mapCaptureToLeadFields({ location: "Raheny" }, AREA).out_of_area).toBe(false);
    // Callers say more than the bare area name.
    expect(
      mapCaptureToLeadFields({ location: "just off the main road in Clontarf" }, AREA)
        .out_of_area,
    ).toBe(false);
  });

  it("matches area regardless of case", () => {
    expect(mapCaptureToLeadFields({ location: "RAHENY" }, AREA).out_of_area).toBe(false);
  });

  it("does not judge area when none is configured", () => {
    // A business that has not set its areas must not have every caller flagged.
    expect(mapCaptureToLeadFields({ location: "Cork" }, [])).not.toHaveProperty(
      "out_of_area",
    );
  });
});
