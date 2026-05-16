import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  doc,
  setDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

// ================= FIREBASE =================
const firebaseConfig = {
  apiKey: "AIzaSyDZ2Y_6unbKlKZ-JPqGMYUIBwCPbzEvH6Y",
  authDomain: "chichat-edc18.firebaseapp.com",
  projectId: "chichat-edc18",
  storageBucket: "chichat-edc18.firebasestorage.app",
  messagingSenderId: "416211065980",
  appId: "1:416211065980:web:25ae99a3f72fcb2d137df9",
  measurementId: "G-LL4W6T5Y62",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============= cooldown sa spam =============
let messageCount = 0;
let cooldownMode = false;
let cooldownUntil = 0;

const MAX_FREE_MESSAGES = 5;
const MESSAGE_DELAY = 5000; // 5 seconds
const BAN_TIME = 60 * 60 * 1000; // 60 minutes

let lastMessageTime = 0;

// ================= DOM =================
const input = document.getElementById("input");
const messages = document.getElementById("messages");
const onlineCountEl = document.getElementById("onlineCount");
const onlineBox = document.getElementById("onlineUsers");

// ================= USER =================
function generateUsername() {
  const adj = ["Cool", "Dark", "Fast", "Lucky", "Neo", "Cyber"];
  const animal = ["Fox", "Wolf", "Tiger", "Eagle", "Shark"];

  return (
    adj[Math.floor(Math.random() * adj.length)] +
    animal[Math.floor(Math.random() * animal.length)] +
    Math.floor(Math.random() * 999)
  );
}

let username = generateUsername();
const userId = crypto.randomUUID();

// ================= ENTER KEY =================
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
});

// ================= SEND MESSAGE =================

window.sendMessage = async function () {
  const text = input.value.trim();
  if (!text) return;

  const now = Date.now();

  // ================= HARD BAN MODE =================
  if (cooldownMode && now < cooldownUntil) {
    showWarning("Slow mode active: wait 5 seconds per message.");
  }

  if (cooldownMode && now < lastMessageTime + MESSAGE_DELAY) {
    showWarning("You are sending too fast!");
    return;
  }

  // ================= MESSAGE LIMIT SYSTEM =================
  if (!cooldownMode) {
    messageCount++;
  }

  // FIRST 5 MESSAGES (NORMAL)
  if (messageCount <= MAX_FREE_MESSAGES) {
    await sendToFirebase(text);
  }
  // AFTER 5 MESSAGES → ACTIVATE SLOW MODE
  else {
    cooldownMode = true;
    cooldownUntil = now + BAN_TIME;

    showWarning("Slow mode activated for 60 minutes (5 sec per message)");
    await sendToFirebase(text);
  }

  lastMessageTime = now;
  input.value = "";
};

async function sendToFirebase(text) {
  await addDoc(collection(db, "messages"), {
    username: username,
    text: text,
    time: Date.now(),
    userId: userId,
  });
}

// ================= REALTIME CHAT =================
const q = query(collection(db, "messages"), orderBy("time"));

onSnapshot(q, (snapshot) => {
  messages.innerHTML = "";

  snapshot.forEach((documentSnapshot) => {
    const data = documentSnapshot.data();
    const messageId = documentSnapshot.id;

    const wrapper = document.createElement("div");
    wrapper.classList.add("message-wrapper");

    const name = document.createElement("div");
    name.classList.add("username");
    name.textContent = data.username;

    const msg = document.createElement("div");
    msg.classList.add("message");
    msg.textContent = data.text;

    // ONLY OWNER CAN DELETE
    if (data.userId === userId) {
      msg.addEventListener("dblclick", async () => {
        const confirmDelete = confirm("Delete your message?");
        if (!confirmDelete) return;

        await deleteDoc(doc(db, "messages", messageId));
      });
    }

    wrapper.appendChild(name);
    wrapper.appendChild(msg);
    messages.appendChild(wrapper);
  });

  messages.scrollTop = messages.scrollHeight;
});

// ================= ONLINE SYSTEM =================
const onlineRef = doc(db, "onlineUsers", userId);

async function goOnline() {
  await setDoc(onlineRef, {
    username: username,
    lastSeen: Date.now(),
  });
}

goOnline();

setInterval(() => {
  setDoc(onlineRef, {
    username: username,
    lastSeen: Date.now(),
  });
}, 5000);

// ================= ONLINE DISPLAY =================
onSnapshot(collection(db, "onlineUsers"), (snapshot) => {
  const now = Date.now();
  let count = 0;

  if (onlineBox) onlineBox.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();

    if (now - data.lastSeen < 10000) {
      count++;

      if (onlineBox) {
        const div = document.createElement("div");
        div.textContent = "🟢 " + data.username;
        onlineBox.appendChild(div);
      }
    }
  });

  if (onlineCountEl) {
    onlineCountEl.textContent = `🟢 Online users: ${count}`;
  }
});
