import { db } from "./firebase";
import { collection, doc, setDoc } from "firebase/firestore";

const MAX_ENTRIES = 500; // Not actively used to truncate Firestore in this basic version, but can be via Functions/scheduled cleanup.

// ─── Timer History ───

export async function logTimerEvent({
  uid,
  habitName,
  targetDuration,
  actualTime,
  status,
  isOpenEnded = false,
  extraTime = 0,
}) {
  if (!uid) return;
  try {
    const historyId = `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const docRef = doc(collection(db, "users", uid, "timerHistory"), historyId);
    await setDoc(docRef, {
      id: historyId,
      habitName,
      targetDuration,
      actualTime,
      status,
      isOpenEnded,
      extraTime,
      timestamp: new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to log timer event to Firestore", err);
  }
}

// ─── Activity Log ───

export async function logActivity({ uid, action, habitName, detail = "" }) {
  if (!uid) return;
  try {
    const logId = `a-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const docRef = doc(collection(db, "users", uid, "activityLog"), logId);
    await setDoc(docRef, {
      id: logId,
      action,
      habitName,
      detail,
      timestamp: new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("Failed to log activity to Firestore", err);
  }
}

// ─── Clear ───
// Clearing logic omitted for simplicity. In production it requires batch deleting collections.
export function clearAllHistory() {
  console.warn("Client-side bulk deletion requires batched writes. Not implemented here.");
}
