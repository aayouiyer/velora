"use strict";

// ── STATE ─────────────────────────────────────────────────
const TOTAL_QUESTIONS = 6;
const MAX_CHARS = 2000;
let questionCount = 0;
let conversationHistory = [];
let isLoading = false;
let currentMode = "debate";

const $ = (id) => document.getElementById(id);

// ── API ───────────────────────────────────────────────────
// The browser never sees the API key or system prompts. It sends the
// conversation and a mode name to our own server, which calls the model.
async function callVelora(messages, mode) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode, messages }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
  if (!data.content) throw new Error("Empty response");
  return data.content;
}

// ── MODE SWITCHER ─────────────────────────────────────────
function switchMode(mode) {
  if (mode === currentMode) return;
  currentMode = mode;
  document.querySelectorAll(".mode-btn").forEach((b) => {
    const active = b.dataset.mode === mode;
    b.classList.toggle("active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  $("modeLabel").textContent = mode === "debate" ? "Debate Mode" : "Mentor Mode";

  if (conversationHistory.length > 0) {
    addMilestone(`Switched to ${mode === "debate" ? "Debate" : "Mentor"} Mode`);
  }
}

// ── SEND ──────────────────────────────────────────────────
async function handleSend(userText) {
  if (!userText || isLoading) return null;
  conversationHistory.push({ role: "user", content: userText });
  isLoading = true;
  try {
    const rawReply = await callVelora(conversationHistory, currentMode);
    const isCoach = rawReply.trimStart().startsWith("[COACH]");
    const reply = rawReply.replace(/^\s*\[(COACH|CASUAL)\]\s*/i, "").trim();
    conversationHistory.push({ role: "assistant", content: reply });
    if (isCoach) questionCount++;
    return { text: reply };
  } catch (e) {
    conversationHistory.pop();
    return { text: e.message, error: true };
  } finally {
    isLoading = false;
  }
}

// ── STATUS CHECK ─────────────────────────────────────────
const LEVELS = new Set(["low", "mid", "high"]);

function sanitizeStatus(parsed) {
  if (!parsed || !Array.isArray(parsed.dims)) throw new Error("Invalid shape");
  const text = (v, max = 300) => (typeof v === "string" ? v.slice(0, max) : "");
  return {
    headline: text(parsed.headline, 160),
    dims: parsed.dims.slice(0, 6).map((d) => ({
      name: text(d?.name, 40),
      pct: Math.max(0, Math.min(100, Math.round(Number(d?.pct) || 0))),
      level: LEVELS.has(d?.level) ? d.level : "low",
    })),
    insights: (Array.isArray(parsed.insights) ? parsed.insights : []).slice(0, 5).map((i) => text(i)),
    verdict: text(parsed.verdict),
  };
}

async function handleStatus() {
  if (conversationHistory.length === 0) {
    return { error: "Share your idea first before checking status." };
  }
  const statusMessages = [
    ...conversationHistory,
    { role: "user", content: "Analyze this conversation and return the JSON status object." },
  ];
  try {
    const raw = await callVelora(statusMessages, "status");
    const jsonMatch = raw.replace(/```json|```/gi, "").match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");
    return sanitizeStatus(JSON.parse(jsonMatch[0]));
  } catch (e) {
    console.error("Status error:", e);
    return { error: "Could not score the idea right now. Try again after a bit more conversation." };
  }
}

function resetSession() {
  questionCount = 0;
  conversationHistory = [];
  isLoading = false;
}

// ── CURSOR ────────────────────────────────────────────────
const cur = $("cur");
const ring = $("cur-ring");
let mx = window.innerWidth / 2, my = window.innerHeight / 2, rx = mx, ry = my;
document.addEventListener("mousemove", (e) => {
  mx = e.clientX; my = e.clientY;
  cur.style.left = mx + "px"; cur.style.top = my + "px";
});
(function lerp() {
  rx += (mx - rx) * 0.12; ry += (my - ry) * 0.12;
  ring.style.left = rx + "px"; ring.style.top = ry + "px";
  requestAnimationFrame(lerp);
})();
document.addEventListener("mouseover", (e) => {
  if (e.target.closest("button, textarea")) ring.classList.add("hover");
});
document.addEventListener("mouseout", (e) => {
  if (e.target.closest("button, textarea")) ring.classList.remove("hover");
});

// ── UI ────────────────────────────────────────────────────
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 160) + "px";
}

function scrollBottom() {
  const m = $("messages");
  m.scrollTop = m.scrollHeight;
}

function updateProgress() {
  const phases = ["Ready", "Exploring", "Digging In", "Challenging", "Getting Deep", "Almost There", "Complete"];
  $("chatPhase").textContent = phases[Math.min(questionCount, TOTAL_QUESTIONS)];
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function addBubble(role, text, isError = false) {
  $("emptyState")?.remove();
  const div = el("div", `msg ${role}${isError ? " error" : ""}`);
  div.append(el("div", "msg-meta", role === "user" ? "You" : "Velora"), el("div", "bubble", text));
  $("messages").appendChild(div);
  scrollBottom();
}

function showTyping() {
  const t = el("div", "typing-bubble");
  t.id = "typing";
  t.append(el("span"), el("span"), el("span"));
  $("messages").appendChild(t);
  scrollBottom();
}

function hideTyping() {
  $("typing")?.remove();
}

function addMilestone(text) {
  $("messages").appendChild(el("div", "milestone", text));
  scrollBottom();
}

function renderSummaryCard(data) {
  $("statusBarCard")?.remove();

  const card = el("div", "summary-card");
  card.id = "statusBarCard";
  card.append(el("div", "sum-label", "◈ Idea Status"));
  if (data.headline) card.append(el("div", "sum-headline", data.headline));

  card.append(el("div", "sum-section", "Dimension Scores"));
  const dims = el("div", "sum-dims");
  data.dims.forEach((d) => {
    const row = el("div", "sum-dim");
    const track = el("div", "sbar-track");
    const fill = el("div", `sbar-fill level-${d.level}`);
    fill.dataset.pct = String(d.pct);
    track.append(fill);
    row.append(el("div", "sum-dim-name", d.name), track, el("div", "sum-dim-pct", `${d.pct}%`));
    dims.append(row);
  });
  card.append(dims);

  if (data.insights.length) {
    card.append(el("div", "sum-section", "Key Takeaways"));
    const list = el("div", "sum-insights");
    data.insights.forEach((i) => {
      const row = el("div", "sum-insight");
      row.append(el("span", "sum-arrow", "→"), el("span", "", i));
      list.append(row);
    });
    card.append(list);
  }

  card.append(el("div", "sum-section", "Verdict"), el("div", "sum-verdict", `"${data.verdict}"`));
  $("messages").appendChild(card);

  requestAnimationFrame(() => requestAnimationFrame(() => {
    card.querySelectorAll(".sbar-fill").forEach((f) => { f.style.width = f.dataset.pct + "%"; });
    card.scrollIntoView({ behavior: "smooth", block: "start" });
  }));
}

async function send() {
  const input = $("input");
  const text = input.value.trim().slice(0, MAX_CHARS);
  if (!text || isLoading) return;

  input.value = "";
  autoResize(input);
  $("sendBtn").disabled = true;

  addBubble("user", text);
  showTyping();
  const reply = await handleSend(text);
  hideTyping();

  if (reply) {
    addBubble("bot", reply.error ? `Error: ${reply.text}` : reply.text, reply.error);
    updateProgress();
  }

  $("sendBtn").disabled = false;
  input.focus();
}

function useStarter(button) {
  $("input").value = button.textContent.trim();
  autoResize($("input"));
  send();
}

const STARTERS = [
  "I want to build an app that helps people find therapists faster",
  "I'm thinking of starting a niche coffee subscription for remote workers",
  "An AI tool that automates social media content for small businesses",
];

function renderEmptyState() {
  const wrap = el("div", "empty-state");
  wrap.id = "emptyState";
  const pills = el("div", "starter-pills");
  STARTERS.forEach((s) => pills.append(el("button", "pill", s)));
  wrap.append(
    el("div", "empty-icon", "💡"),
    el("h2", "", "What's your idea?"),
    el("p", "", "Describe your business idea and Velora will ask the questions that help you think it through, not think for you."),
    pills,
  );
  $("messages").replaceChildren(wrap);
}

// ── EVENTS ────────────────────────────────────────────────
document.querySelectorAll(".mode-btn").forEach((b) => {
  b.addEventListener("click", () => switchMode(b.dataset.mode));
});

$("messages").addEventListener("click", (e) => {
  const pill = e.target.closest(".pill");
  if (pill) useStarter(pill);
});

$("input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
});
$("input").addEventListener("input", (e) => autoResize(e.target));
$("sendBtn").addEventListener("click", send);

let statusLoading = false;
$("summaryBtn").addEventListener("click", async () => {
  if (statusLoading) return;
  statusLoading = true;
  const btn = $("summaryBtn");
  btn.textContent = "Analyzing…";
  btn.className = "summary-btn loading-sum";
  btn.disabled = true;

  addMilestone("Scoring your idea…");
  const data = await handleStatus();
  if (data.error) addMilestone(data.error);
  else renderSummaryCard(data);

  btn.textContent = "◈ Check Idea Status";
  btn.className = "summary-btn unlocked";
  btn.disabled = false;
  statusLoading = false;
});

$("resetBtn").addEventListener("click", () => {
  resetSession();
  renderEmptyState();
  updateProgress();
});
