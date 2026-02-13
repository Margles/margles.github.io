// ---------- tiny helpers to avoid "null.addEventListener" crashes ----------
function $(id) { return document.getElementById(id); }
function on(el, evt, fn) { if (el) el.addEventListener(evt, fn); }
function show(el) { if (el) el.classList.remove("is-hidden"); }
function hide(el) { if (el) el.classList.add("is-hidden"); }

// ---------- Supabase init ----------
if (!window.supabase) {
  console.error("Supabase CDN not loaded. Make sure supabase-js script is before app.js");
}
const { createClient } = window.supabase ?? {};
const SUPABASE_URL = "https://cyhbpzqpcoavvtooyybr.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN5aGJwenFwY29hdnZ0b295eWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA5NTQ3MDYsImV4cCI6MjA4NjUzMDcwNn0.ZyLL4whcMMltYI1CiwqoBykka7d9WDhij3Ad48jmAWk";
const db = createClient ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY) : null;

// ---------- DOM ----------
// posts/composer
const newPostBtn = $("newPostBtn");
const postForm = $("postForm");
const cancelPost = $("cancelPost");
const feed = $("feed");
const postTitle = $("postTitle");
const postBody = $("postBody");

// report modal
const reportModal = $("modal");
const reportClose = $("modalClose");

// header auth buttons + status
const openLogin = $("openLogin");
const openSignup = $("openSignup");
const navStatus = $("navStatus");

// auth modal + forms
const authModal = $("authModal");
const authStatusText = $("authStatusText");
const logoutBtn = $("logoutBtn");

const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPass = $("loginPass");

const signupForm = $("signupForm");
const signupEmail = $("signupEmail");
const signupUser = $("signupUser");
const signupPass = $("signupPass");

const setUserForm = $("setUserForm");
const setUserInput = $("setUserInput");

// close buttons
const authClose1 = $("authClose1");
const authClose2 = $("authClose2");
const authClose3 = $("authClose3");

// ---------- state ----------
let currentUser = null;
let currentProfile = null;

// ---------- helpers ----------
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeUsername(u) { return u.trim().toLowerCase(); }
function validateUsername(u) { return /^[a-z0-9_]{3,20}$/.test(u); }

function showComposer() { show(postForm); postTitle?.focus(); }
function hideComposer() { hide(postForm); postForm?.reset(); }

function showReportModal() { show(reportModal); }
function hideReportModal() { hide(reportModal); }

function showAuthModal(which) {
  show(authModal);
  hide(loginForm); hide(signupForm); hide(setUserForm);
  if (which === "login") show(loginForm);
  if (which === "signup") show(signupForm);
  if (which === "setuser") show(setUserForm);
}
function hideAuthModal() { hide(authModal); }

function setAuthStatusUI() {
  const hasUser = !!currentUser;
  const uname = currentProfile?.username;

  const msg = hasUser ? `logged in as ${uname ?? "??"}` : "";

  if (authStatusText) {
    authStatusText.textContent = hasUser ? `logged in as ${uname ?? "??"}` : "not logged in";
  }
  if (navStatus) {
    navStatus.textContent = msg;
  }
  if (logoutBtn) logoutBtn.classList.toggle("is-hidden", !hasUser);
}

// ---------- data ----------
async function loadProfile() {
  if (!db || !currentUser) { currentProfile = null; return; }
  const { data, error } = await db
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", currentUser.id)
    .maybeSingle();
  if (error) { console.error(error); currentProfile = null; return; }
  currentProfile = data ?? null;
}

function makePostHtml(row) {
  const when = new Date(row.created_at).toLocaleString();
  const username = row.profiles?.username ?? "unknown";
  const isOwner = currentUser && row.user_id === currentUser.id;

  return `
    <article class="post" data-id="${row.id}">
      <div class="content">
        <h2 class="title">${escapeHtml(row.title)}</h2>
        <div class="meta">posted by <span class="user">${escapeHtml(username)}</span> • ${escapeHtml(when)}</div>
        <p class="excerpt">${escapeHtml(row.body)}</p>
        <div class="actions">
          ${isOwner ? `<button class="action delete" type="button">delete</button>` : ``}
          <button class="action report" type="button">report</button>
        </div>
      </div>
    </article>
  `;
}

async function loadAndRender() {
  if (!db || !feed) return;
  const { data, error } = await db
    .from("posts")
    .select("id,title,body,created_at,user_id,profiles(username)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    feed.innerHTML = `<div style="padding:10px;border:1px solid var(--border);background:var(--panel);">Backend error: ${escapeHtml(error.message)}</div>`;
    return;
  }
  feed.innerHTML = data.map(makePostHtml).join("");
}

// ---------- init ----------
(async function init() {
  if (!db) return;
  const { data } = await db.auth.getUser();
  currentUser = data?.user ?? null;
  await loadProfile();
  setAuthStatusUI();
  await loadAndRender();
})();

if (db) {
  db.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user ?? null;
    await loadProfile();
    setAuthStatusUI();
    await loadAndRender();
  });
}

// ---------- wire UI events ----------
// header buttons
on(openLogin, "click", () => showAuthModal("login"));
on(openSignup, "click", () => showAuthModal("signup"));

// close auth modal
on(authClose1, "click", hideAuthModal);
on(authClose2, "click", hideAuthModal);
on(authClose3, "click", hideAuthModal);

on(authModal, "click", (e) => { if (e.target?.dataset?.close === "true") hideAuthModal(); });

// report modal close
on(reportModal, "click", (e) => { if (e.target?.dataset?.close === "true") hideReportModal(); });
on(reportClose, "click", hideReportModal);

// logout (in auth modal)
on(logoutBtn, "click", async () => {
  if (!db) return;
  const { error } = await db.auth.signOut();
  if (error) { alert(`Logout failed: ${error.message}`); return; }
  currentUser = null;
  currentProfile = null;
  setAuthStatusUI();
  hideAuthModal();
  await loadAndRender();
});

// login
on(loginForm, "submit", async (e) => {
  e.preventDefault();
  if (!db) return;
  const email = loginEmail?.value.trim();
  const password = loginPass?.value;
  if (!email || !password) return;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) { alert(`Login failed: ${error.message}`); return; }

  currentUser = data.user;
  await loadProfile();
  setAuthStatusUI();
  if (!currentProfile?.username) showAuthModal("setuser");
  else hideAuthModal();
  await loadAndRender();
});

// signup
on(signupForm, "submit", async (e) => {
  e.preventDefault();
  if (!db) return;

  const email = signupEmail?.value.trim();
  const password = signupPass?.value;
  const username = normalizeUsername(signupUser?.value ?? "");

  if (!email || !password) return;
  if (!validateUsername(username)) {
    alert("Username must be 3-20 chars: a-z, 0-9, underscore.");
    return;
  }

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) { alert(`Sign up failed: ${error.message}`); return; }

  currentUser = data.user;

  const ins = await db.from("profiles").insert([{ user_id: currentUser.id, username }]);
  if (ins.error) {
    alert(`Username error: ${ins.error.message}`);
    showAuthModal("setuser");
  } else {
    await loadProfile();
    hideAuthModal();
  }

  setAuthStatusUI();
  await loadAndRender();
});

// set username (for users missing a profile or with taken username)
on(setUserForm, "submit", async (e) => {
  e.preventDefault();
  if (!db || !currentUser) return;

  const username = normalizeUsername(setUserInput?.value ?? "");
  if (!validateUsername(username)) {
    alert("Username must be 3-20 chars: a-z, 0-9, underscore.");
    return;
  }

  const ins = await db.from("profiles").insert([{ user_id: currentUser.id, username }]);
  if (ins.error) {
    const upd = await db.from("profiles").update({ username }).eq("user_id", currentUser.id);
    if (upd.error) { alert(`Username error: ${upd.error.message}`); return; }
  }

  await loadProfile();
  setAuthStatusUI();
  hideAuthModal();
  await loadAndRender();
});

// Composer
on(newPostBtn, "click", (e) => {
  e.preventDefault();
  if (!currentUser) { showAuthModal("login"); return; }
  if (!currentProfile?.username) { showAuthModal("setuser"); return; }
  if (postForm?.classList.contains("is-hidden")) showComposer();
  else hideComposer();
});

on(cancelPost, "click", hideComposer);

on(postForm, "submit", async (e) => {
  e.preventDefault();
  if (!db || !currentUser) return;

  const title = postTitle?.value.trim();
  const body = postBody?.value.trim();
  if (!title || !body) return;

  const { error } = await db.from("posts").insert([{ title, body }]);
  if (error) { alert(`Post failed: ${error.message}`); return; }

  hideComposer();
  await loadAndRender();
});

// Feed actions
on(feed, "click", async (e) => {
  const reportBtn = e.target.closest(".action.report");
  const deleteBtn = e.target.closest(".action.delete");

  if (reportBtn) { showReportModal(); return; }

  if (deleteBtn) {
    const postEl = e.target.closest(".post");
    const id = postEl?.dataset?.id;
    if (!id || !db) return;

    const { error } = await db.from("posts").delete().eq("id", id);
    if (error) { alert(`Delete failed: ${error.message}`); return; }
    postEl.remove();
  }
});
