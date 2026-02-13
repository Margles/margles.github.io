const newPostBtn = document.getElementById("newPostBtn");
const postForm = document.getElementById("postForm");
const cancelPost = document.getElementById("cancelPost");
const feed = document.getElementById("feed");
const postTitle = document.getElementById("postTitle");
const postBody = document.getElementById("postBody");

const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");

function showForm() {
  postForm.classList.remove("is-hidden");
  postTitle.focus();
}

function hideForm() {
  postForm.classList.add("is-hidden");
  postForm.reset();
}

function escapeHtml(str) {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function makePostHtml({ title, body, user = "you", when = "just now" }) {
  return `
    <article class="post" data-owner="true">
      <div class="score">▲<br /><span>1</span><br />▼</div>
      <div class="content">
        <h2 class="title">${escapeHtml(title)}</h2>
        <div class="meta">posted by <span class="user">${escapeHtml(user)}</span> • ${escapeHtml(when)}</div>
        <p class="excerpt">${escapeHtml(body)}</p>
        <div class="actions">
          <button class="action delete" type="button">delete</button>
          <button class="action report" type="button">report</button>
        </div>
      </div>
    </article>
  `;
}

/* --- New post toggle --- */
newPostBtn.addEventListener("click", (e) => {
  e.preventDefault();
  if (postForm.classList.contains("is-hidden")) showForm();
  else hideForm();
});

cancelPost.addEventListener("click", () => hideForm());

/* --- Create post --- */
postForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const title = postTitle.value.trim();
  const body = postBody.value.trim();
  if (!title || !body) return;

  const wrapper = document.createElement("div");
  wrapper.innerHTML = makePostHtml({ title, body });
  const newPost = wrapper.firstElementChild;

  feed.prepend(newPost);
  hideForm();
  newPost.scrollIntoView({ behavior: "smooth", block: "start" });
});

/* --- Modal --- */
function showModal() {
  modal.classList.remove("is-hidden");
}

function hideModal() {
  modal.classList.add("is-hidden");
}

modalClose.addEventListener("click", hideModal);
modal.addEventListener("click", (e) => {
  if (e.target?.dataset?.close === "true") hideModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modal.classList.contains("is-hidden")) hideModal();
});

/* --- Actions: delete/report --- */
feed.addEventListener("click", (e) => {
  const reportBtn = e.target.closest(".action.report");
  const deleteBtn = e.target.closest(".action.delete");

  if (reportBtn) {
    showModal();
    return;
  }

  if (deleteBtn) {
    const post = e.target.closest(".post");
    const isOwner = post?.dataset?.owner === "true";
    if (!isOwner) return;
    post.remove();
  }
});
