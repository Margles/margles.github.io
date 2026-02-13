// 1) Supabase init (CDN exposes a global `supabase`)
const { createClient } = supabase; // from the CDN script
const SUPABASE_URL = "https://cyhbpzqpcoavvtooyybr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_0P0QzheZiRmxrZueraw_Ng_k2ua0Af-";
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2) DOM
const newPostBtn = document.getElementById("newPostBtn");
const postForm = document.getElementById("postForm");
const cancelPost = document.getElementById("cancelPost");
const feed = document.getElementById("feed");
const postTitle = document.getElementById("postTitle");
const postBody = document.getElementById("postBody");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");

// 3) UI helpers
function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function makePostHtml(post) {
  const when = new Date(post.created_at).toLocaleString();
  return `
    <article class="post" data-id="${post.id}">
      <div class="score">▲<br /><span>1</span><br />▼</div>
      <div class="content">
        <h2 class="title">${escapeHtml(post.title)}</h2>
        <div class="meta">posted • ${escapeHtml(when)}</div>
        <p class="excerpt">${escapeHtml(post.body)}</p>
        <div class="actions">
          <button class="action delete" type="button">delete</button>
          <button class="action report" type="button">report</button>
        </div>
      </div>
    </article>
  `;
}

async function loadAndRender() {
  const { data, error } = await db
    .from("posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    feed.innerHTML = `<div style="padding:10px;border:1px solid var(--border);background:var(--panel);">Backend error: ${escapeHtml(error.message)}</div>`;
    return;
  }

  feed.innerHTML = data.map(makePostHtml).join("");
}

// 4) Init
loadAndRender();

// 5) Events
newPostBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (postForm.classList.contains("is-hidden")) showForm();
  else hideForm();
});

cancelPost.addEventListener("click", () => hideForm());

postForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!title || !body) return;

  const { error } = await db.from("posts").insert([{ title, body }]);
  if (error) {
    console.error(error);
    alert(`Post failed: ${error.message}`);
    return;
  }

  hideForm();
  await loadAndRender();
});

modalClose.addEventListener("click", hideModal);
modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") hideModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("is-hidden")) hideModal();
});

// Delegate actions
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

    // TEMP: this works only because we allowed anon delete in RLS
    const { error } = await db.from("posts").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert(`Delete failed: ${error.message}`);
      return;
    }

    postEl.remove();
  }
});
