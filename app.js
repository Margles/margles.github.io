const { createClient } = supabase;
const SUPABASE_URL = "https://cyhbpzqpcoavvtooyybr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0P0QzheZiRmxrZueraw_Ng_k2ua0Af-";
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// DOM - posts
const newPostBtn = document.getElementById("newPostBtn");
const postForm = document.getElementById("postForm");
const cancelPost = document.getElementById("cancelPost");
const feed = document.getElementById("feed");
const postTitle = document.getElementById("postTitle");
const postBody = document.getElementById("postBody");

// DOM - report modal
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");

// DOM - auth buttons in header
const openLogin = document.getElementById("openLogin");
const openSignup = document.getElementById("openSignup");

// DOM - auth modal + forms
const authModal = document.getElementById("authModal");
const authStatusText = document.getElementById("authStatusText");
const logoutBtn = document.getElementById("logoutBtn");

const loginForm = document.getElementById("loginForm");
const loginEmail = document.getElementById("loginEmail");
const loginPass = document.getElementById("loginPass");

const signupForm = document.getElementById("signupForm");
const signupEmail = document.getElementById("signupEmail");
const signupUser = document.getElementById("signupUser");
const signupPass = document.getElementById("signupPass");

const setUserForm = document.getElementById("setUserForm");
const setUserInput = document.getElementById("setUserInput");

document.getElementById("authClose1").addEventListener("click", hideAuthModal);
document.getElementById("authClose2").addEventListener("click", hideAuthModal);
document.getElementById("authClose3").addEventListener("click", hideAuthModal);

// State
let currentUser = null;
let currentProfile = null;

// Helpers
function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeUsername(u) {
  return u.trim().toLowerCase();
}
function validateUsername(u) {
  return /^[a-z0-9_]{3,20}$/.test(u);
}

function showForm() {
  postForm.classList.remove("is-hidden");
  postTitle.focus();
}
function hideForm() {
  postForm.classList.add("is-hidden");
  postForm.reset();
}

function showModal() {
  modal.classList.remove("is-hidden");
}
function hideModal() {
  modal.classList.add("is-hidden");
}

// Auth modal controls
function showAuthModal(which) {
  authModal.classList.remove("is-hidden");
  loginForm.classList.add("is-hidden");
  signupForm.classList.add("is-hidden");
  setUserForm.classList.add("is-hidden");

  if (which === "login") loginForm.classList.remove("is-hidden");
  if (which === "signup") signupForm.classList.remove("is-hidden");
  if (which === "setuser") setUserForm.classList.remove("is-hidden");
}

function hideAuthModal() {
  authModal.classList.add("is-hidden");
}

authModal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") hideAuthModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!modal.classList.contains("is-hidden")) hideModal();
    if (!authModal.classList.contains("is-hidden")) hideAuthModal();
  }
});

function setAuthStatusUI() {
  const hasUser = !!currentUser;
  const uname = currentProfile?.username;

  authStatusText.textContent = hasUser
    ? `logged in as ${uname ?? "??"}`
    : "not logged in";

  logoutBtn.classList.toggle("is-hidden", !hasUser);
}

// Data
async function loadProfile() {
  if (!currentUser) {
    currentProfile = null;
    return;
  }
  const { data, error } = await db
    .from("profiles")
    .select("user_id, username")
    .eq("user_id", currentUser.id)
    .maybeSingle();

  if (error) {
    console.error(error);
    currentProfile = null;
    return;
  }
  currentProfile = data ?? null;
}

function makePostHtml(row) {
  const when = new Date(row.created_at).toLocaleString();
  const username = row.profiles?.username ?? "unknown";
  const isOwner = currentUser && row.user_id === currentUser.id;

  return `
    <article class="post" data-id="${row.id}">
      <div class="score">▲<br /><span>1</span><br />▼</div>
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

// Init
(async function init() {
  const { data } = await db.auth.getUser();
  currentUser = data?.user ?? null;
  await loadProfile();
  setAuthStatusUI();
  await loadAndRender();
})();

db.auth.onAuthStateChange(async (_event, session) => {
  currentUser = session?.user ?? null;
  await loadProfile();
  setAuthStatusUI();
  await loadAndRender();
});

// Header buttons
openLogin.addEventListener("click", () => showAuthModal("login"));
openSignup.addEventListener("click", () => showAuthModal("signup"));

// Auth submit handlers
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginEmail.value.trim();
  const password = loginPass.value;
  if (!email || !password) return;

  const { data, error } = await db.auth.signInWithPassword({ email, password });
  if (error) {
    alert(`Login failed: ${error.message}`);
    return;
  }

  currentUser = data.user;
  await loadProfile();
  setAuthStatusUI();

  if (!currentProfile?.username) showAuthModal("setuser");
  else hideAuthModal();

  await loadAndRender();
});

signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = signupEmail.value.trim();
  const password = signupPass.value;
  const username = normalizeUsername(signupUser.value);

  if (!email || !password) return;
  if (!validateUsername(username)) {
    alert("Username must be 3-20 chars: a-z, 0-9, underscore.");
    return;
  }

  const { data, error } = await db.auth.signUp({ email, password });
  if (error) {
    alert(`Sign up failed: ${error.message}`);
    return;
  }

  currentUser = data.user;

  // create profile
  const ins = await db.from("profiles").insert([{ user_id: currentUser.id, username }]);
  if (ins.error) {
    alert(`Username error: ${ins.error.message}`);
    // user is signed up/logged in; prompt to set a different username
    showAuthModal("setuser");
  } else {
    await loadProfile();
    hideAuthModal();
  }

  setAuthStatusUI();
  await loadAndRender();
});

setUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const username = normalizeUsername(setUserInput.value);
  if (!validateUsername(username)) {
    alert("Username must be 3-20 chars: a-z, 0-9, underscore.");
    return;
  }

  // insert or update
  const ins = await db
    .from("profiles")
    .insert([{ user_id: currentUser.id, username }]);

  if (ins.error) {
    const upd = await db
      .from("profiles")
      .update({ username })
      .eq("user_id", currentUser.id);

    if (upd.error) {
      alert(`Username error: ${upd.error.message}`);
      return;
    }
  }

  await loadProfile();
  setAuthStatusUI();
  hideAuthModal();
  await loadAndRender();
});

logoutBtn.addEventListener("click", async () => {
  const { error } = await db.auth.signOut();
  if (error) {
    alert(`Logout failed: ${error.message}`);
    return;
  }
  currentUser = null;
  currentProfile = null;
  setAuthStatusUI();
  hideAuthModal();
  await loadAndRender();
});

// Subheader new post: requires auth + username
newPostBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (!currentUser) {
    showAuthModal("login");
    return;
  }
  if (!currentProfile?.username) {
    showAuthModal("setuser");
    return;
  }
  if (postForm.classList.contains("is-hidden")) showForm();
  else hideForm();
});

cancelPost.addEventListener("click", () => hideForm());

// Create post
postForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!currentUser) return;

  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!title || !body) return;

  const { error } = await db.from("posts").insert([{ title, body }]);
  if (error) {
    alert(`Post failed: ${error.message}`);
    return;
  }

  hideForm();
  await loadAndRender();
});

// Report modal
modalClose.addEventListener("click", hideModal);
modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") hideModal();
});

// Post actions
feed.addEventListener("click", async (e) => {
  const reportBtn = e.target.closest(".action.report");
  const deleteBtn = e.target.closest(".action.delete");

  if (reportBtn) {
    showModal();
    return;
  }

  if (deleteBtn) {
    const postEl = e.target.closest(".post");
    const id = postEl?.dataset?.id;
    if (!id) return;

    const { error } = await db.from("posts").delete().eq("id", id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    postEl.remove();
  }
});
