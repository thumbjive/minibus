import invariant from "tiny-invariant";

export type MinibusCallback = {
  (...args: any[]): boolean | void;
  __runOnce?: boolean;
};

export type MinibusUnsubscriber = { unsubscribe: () => void };

export interface MinibusEmitter {
  (channelName: string, ...args: any[]): void;
}

export interface MinibusSubscriber {
  (
    channelName: string,
    callback: MinibusCallback,
    once?: boolean
  ): MinibusUnsubscriber;
}

export type MinibusSubscriptionSet = {
  [index: string]: Set<MinibusCallback>;
};

export type MinibusDeferredSet = Set<string>;

export interface Minibus {
  emit: MinibusEmitter;
  defer: MinibusEmitter;
  subscribe: MinibusSubscriber;
  subscribeOnce: MinibusSubscriber;
  clearSubscriptions: () => void;
  isChannelEmpty: (name: string) => boolean;
  $__subs: MinibusSubscriptionSet;
  $__defers: MinibusDeferredSet;
  $__isMinibus: boolean;
}

export const createMinibus = (): Minibus => {
  let __subscriptions: MinibusSubscriptionSet = {};

  let __deferredEmitions: MinibusDeferredSet = new Set();

  const emit: MinibusEmitter = (channelName: string, ...args: any[]) => {
    if (isChannelEmpty(channelName)) {
      return;
    }

    const listeners = __subscriptions[channelName];
    const it = listeners.values();
    let entry = it.next();
    while (!entry.done) {
      let propagate: boolean | void = true;
      const callback: MinibusCallback = entry.value;
      propagate = callback(...args);
      if (callback.__runOnce) {
        const unsubscriber = createUnsubscribe(channelName, callback);
        unsubscriber();
      }
      if (propagate === false) {
        break;
      }

      entry = it.next();
    }
  };

  const defer: MinibusEmitter = (channelName: string, ...args) => {
    invariant(
      args.length === 0,
      "defer does not support passing extra arguments"
    );

    __deferredEmitions.add(channelName);
    emit(channelName);
  };

  const clearSubscriptions = () => {
    __subscriptions = {};
  };

  const createUnsubscribe = (
    channelName: string,
    callback: MinibusCallback
  ) => {
    return () => {
      if (typeof __subscriptions[channelName] === "undefined") {
        return;
      }
      return __subscriptions[channelName].delete(callback);
    };
  };

  // creates a subscription and returns the unsubscribe function;
  const subscribe: MinibusSubscriber = (
    channelName: string,
    callback: MinibusCallback,
    once: boolean = false
  ): MinibusUnsubscriber => {
    if (typeof __subscriptions[channelName] === "undefined") {
      __subscriptions[channelName] = new Set();
    }

    invariant(
      typeof callback === "function",
      "callback is not a valid function"
    );

    // in case the emitter has been configured to support deferred calls
    // we run the callback immediatly
    if (__deferredEmitions.has(channelName)) {
      callback();
      // stop here if this is supposed to run only once.
      if (once) {
        return { unsubscribe: () => {} };
      }
    }

    // private property added on the function itself
    // if true, we'll discard it immediately after the first run
    callback.__runOnce = once;

    __subscriptions[channelName].add(callback);
    return {
      unsubscribe: createUnsubscribe(channelName, callback),
    };
  };

  const subscribeOnce = (channelName: string, callback: MinibusCallback) => {
    return subscribe(channelName, callback, true);
  };

  const isChannelEmpty = (channelName: string): boolean => {
    const channel = __subscriptions[channelName];
    return typeof channel === "undefined" || channel.size === 0;
  };

  return {
    emit,
    defer,
    subscribe,
    subscribeOnce,
    clearSubscriptions,
    isChannelEmpty,
    $__subs: __subscriptions,
    $__defers: __deferredEmitions,
    $__isMinibus: true,
  };
};

/**
 * Named instances are stored in memory
 */
const __buses: { [index: string]: Minibus } = {};

/**
 * Utility to check on runtime if an object is a Minibus instance or not
 */
const isMinibus = (obj: any): boolean => {
  if (typeof obj === "undefined") {
    return false;
  }

  if (obj.$__isMinibus) {
    return true;
  }

  return false;
};

/**
 * Get or create named instance
 */
export const getBus = (busName = "global"): Minibus => {
  if (!isMinibus(__buses[busName])) {
    __buses[busName] = createMinibus();
  }

  return __buses[busName];
};
