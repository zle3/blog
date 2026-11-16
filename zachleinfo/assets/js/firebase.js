// Site override of Blowfish firebase.js (views + likes).
// Changes from upstream, all about keeping state consistent:
// - Counts are written with atomic increment() and merge, so concurrent
//   first views/likes can't overwrite each other (no read-then-write).
// - The like button is an explicit state machine:
//     loading -> ready(liked|unliked) <-> busy -> ready, or loading -> failed
//   It is disabled until sign-in finishes and while a write is in flight,
//   so double clicks can't double count.
// - The liked flag is kept in sync across tabs via the storage event.
// - localStorage access never throws (privacy modes), and failures stop the
//   loading placeholders instead of leaving them pulsing forever.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  increment,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

const store = {
  get(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  },
  remove(k) {
    try {
      localStorage.removeItem(k);
    } catch (e) {}
  },
};

function formatNumber(n) {
  return Math.max(0, Number(n) || 0)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Counter placeholders carry pulsing "loading" classes until a value arrives.
function settleCounter(node, text) {
  if (node.dataset.settled !== "1") {
    node.className = "";
    node.dataset.settled = "1";
  }
  node.textContent = text;
}

function failAll() {
  document.querySelectorAll("span[id^='views_'], span[id^='likes_']").forEach((n) => settleCounter(n, "–"));
  likeUI.set("failed");
}

// ---- Like button state machine ------------------------------------------
const likeUI = {
  state: "loading", // loading | ready | busy | failed
  liked: false,
  buttons: () => document.querySelectorAll("button#button_likes, [id='button_likes']"),
  render() {
    const liked = this.liked;
    document.querySelectorAll("span[id='button_likes_heart']").forEach((el) => {
      el.style.display = liked ? "" : "none";
      el.classList.remove("hidden");
    });
    document.querySelectorAll("span[id='button_likes_emtpty_heart']").forEach((el) => {
      el.style.display = liked ? "none" : "";
    });
    document.querySelectorAll("span[id='button_likes_text']").forEach((el) => {
      el.textContent = liked ? "" : "\xa0Like";
    });
    this.buttons().forEach((b) => {
      b.disabled = this.state !== "ready";
      b.setAttribute("aria-pressed", liked ? "true" : "false");
      b.setAttribute("aria-busy", this.state === "busy" || this.state === "loading" ? "true" : "false");
      b.style.display = this.state === "failed" ? "none" : "";
    });
  },
  set(state, liked = this.liked) {
    this.state = state;
    this.liked = liked;
    this.render();
  },
};

let db, oids;
try {
  const configEl = document.getElementById("firebase-config");
  if (!configEl?.textContent) throw new Error("Firebase config element not found");
  const data = JSON.parse(configEl.textContent);
  const app = initializeApp(data.config);
  oids = { views: configEl.getAttribute("data-views"), likes: configEl.getAttribute("data-likes") };
  db = getFirestore(app);

  const id = oids?.views?.replaceAll("/", "-");
  const idLikes = oids?.likes?.replaceAll("/", "-");

  likeUI.set("loading", !!(idLikes && store.get(idLikes)));

  const watch = (collection, node) => {
    const docId = node.id.replaceAll("/", "-");
    onSnapshot(
      doc(db, collection, docId),
      (snap) => settleCounter(node, snap.exists() ? formatNumber(snap.data()[collection]) : "0"),
      (error) => {
        console.error("Firebase snapshot failed:", error);
        settleCounter(node, "–");
      },
    );
  };

  const recordView = async () => {
    if (!id || store.get(id)) return;
    store.set(id, "true"); // mark first so a second tab/reload doesn't double count
    try {
      await setDoc(doc(db, "views", id), { views: increment(1) }, { merge: true });
    } catch (e) {
      store.remove(id);
      console.error("Record view failed:", e.message);
    }
  };

  const toggleLike = async () => {
    if (!idLikes || likeUI.state !== "ready") return;
    const target = !likeUI.liked;
    likeUI.set("busy", target); // optimistic, button disabled until the write settles
    target ? store.set(idLikes, "true") : store.remove(idLikes);
    try {
      await setDoc(doc(db, "likes", idLikes), { likes: increment(target ? 1 : -1) }, { merge: true });
      likeUI.set("ready", target);
    } catch (e) {
      console.error("Like failed:", e.message);
      !target ? store.set(idLikes, "true") : store.remove(idLikes);
      likeUI.set("ready", !target);
    }
  };

  // Another tab liked/unliked this page: adopt its state, don't write again.
  window.addEventListener("storage", (event) => {
    if (idLikes && event.key === idLikes && likeUI.state === "ready") {
      likeUI.set("ready", event.newValue !== null);
    }
  });

  likeUI.buttons().forEach((b) => b.addEventListener("click", toggleLike));
  window.process_article = toggleLike;

  signInAnonymously(getAuth(app))
    .then(() => {
      document.querySelectorAll("span[id^='views_']").forEach((n) => n.id && watch("views", n));
      document.querySelectorAll("span[id^='likes_']").forEach((n) => n.id && watch("likes", n));
      recordView();
      likeUI.set("ready", !!(idLikes && store.get(idLikes)));
    })
    .catch((error) => {
      console.error("Firebase anonymous sign-in failed:", error.message);
      failAll();
    });
} catch (e) {
  console.error("Firebase initialization failed:", e.message);
  failAll();
}
