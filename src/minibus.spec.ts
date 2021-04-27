import { createMinibus } from "./minibus";

describe("Microbus", () => {
  it("subscribes", () => {
    const bus = createMinibus();
    expect(bus).toHaveProperty("subscribe");
    expect(bus.isChannelEmpty("test")).toBe(true);

    const testFn = jest.fn(() => false);

    bus.subscribe("test", testFn);
    expect(bus.isChannelEmpty("test")).toBe(false);
  });

  it("unsubscribes", () => {
    const bus = createMinibus();
    expect(bus).toHaveProperty("subscribe");
    expect(bus.isChannelEmpty("test")).toBe(true);

    const testFn = jest.fn(() => false);

    const sub = bus.subscribe("test", testFn);
    expect(bus.isChannelEmpty("test")).toBe(false);
    expect(sub).toHaveProperty("unsubscribe");
    sub.unsubscribe();
    expect(bus.isChannelEmpty("test")).toBe(true);
  });

  it("emits", () => {
    const bus = createMinibus();
    const testFn = jest.fn(() => false);

    bus.subscribe("test", testFn);
    bus.emit("test");
    expect(testFn).toBeCalledTimes(1);
    bus.emit("test");
    expect(testFn).toBeCalledTimes(2);
  });

  it("emits once", () => {
    const bus = createMinibus();
    const testFn = jest.fn(() => false);

    bus.subscribeOnce("test", testFn);
    bus.emit("test");
    expect(testFn).toBeCalledTimes(1);

    expect(bus.isChannelEmpty("test")).toBe(true);
  });

  it("defers", () => {
    const bus = createMinibus();
    const testFn = jest.fn(() => false);

    bus.defer("test");
    bus.defer("test");
    bus.defer("test");
    bus.subscribeOnce("test", testFn);
    expect(testFn).toBeCalledTimes(1);
  });
});
