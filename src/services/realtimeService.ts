import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

export type ListRealtimeEvent =
  | "product:created"
  | "product:updated"
  | "product:deleted"
  | "product:purchased"
  | "list:updated"
  | "list:access-changed";

type ListSubscriptionCallbacks = {
  userId: string;
  userName: string;
  onRemoteEvent: (event: ListRealtimeEvent) => void;
  onPresenceChange?: (count: number) => void;
};

export function subscribeToList(listId: string, callbacks: ListSubscriptionCallbacks) {
  if (!supabase || !isSupabaseConfigured) {
    return () => undefined;
  }

  const channel = supabase.channel(`list:${listId}`, {
    config: {
      broadcast: { self: false },
      presence: { key: callbacks.userId }
    }
  });

  channel
    .on("broadcast", { event: "list-event" }, ({ payload }) => {
      const event = normalizeRealtimeEvent(payload);
      if (event) {
        callbacks.onRemoteEvent(event);
      }
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      callbacks.onPresenceChange?.(Object.keys(state).length);
    })
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        void channel.track({
          userId: callbacks.userId,
          name: callbacks.userName,
          onlineAt: new Date().toISOString()
        });
      }
    });

  return () => {
    void channel.untrack();
    void supabase.removeChannel(channel);
  };
}

export async function broadcastListEvent(listId: string, event: ListRealtimeEvent) {
  if (!supabase || !isSupabaseConfigured) {
    return;
  }

  const channel = supabase.channel(`list:${listId}`);
  await channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.send({
        type: "broadcast",
        event: "list-event",
        payload: { listId, eventType: event }
      });
      await supabase.removeChannel(channel);
    }
  });
}

function normalizeRealtimeEvent(payload: unknown): ListRealtimeEvent | null {
  if (!payload || typeof payload !== "object" || !("eventType" in payload)) {
    return null;
  }

  const eventType = (payload as { eventType?: unknown }).eventType;
  return isListRealtimeEvent(eventType) ? eventType : null;
}

function isListRealtimeEvent(value: unknown): value is ListRealtimeEvent {
  return (
    value === "product:created" ||
    value === "product:updated" ||
    value === "product:deleted" ||
    value === "product:purchased" ||
    value === "list:updated" ||
    value === "list:access-changed"
  );
}
