(function () {
  const DB = window.PHOTO_DB;
  const state = {
    currentView: "index",
    currentStory: null,
    archiveFilter: "all",
    likes: JSON.parse(localStorage.getItem("photo-journal-likes") || "{}"),
    comments: JSON.parse(localStorage.getItem("photo-journal-comments") || "null") || DB.comments
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const escapeHTML = (value) => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
  }

  function setView(view) {
    state.currentView = view;
    $$("[data-view-panel]").forEach((panel) => {
      panel.classList.toggle("is-visible", panel.dataset.viewPanel === view);
    });
    $$(".nav-link").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === view);
    });
    $("#mobileNav").classList.remove("is-open");
    $("#menuToggle").setAttribute("aria-expanded", "false");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function noteMarkup(note) {
    return `
      <button class="note-item" data-lightbox="${note.image}" aria-label="查看 ${escapeHTML(note.date)} 的照片">
        <img src="${note.image}" alt="${escapeHTML(note.text)}">
        <p>${escapeHTML(note.text)}</p>
        <time>${escapeHTML(note.date)}</time>
      </button>
    `;
  }

  function renderNotes() {
    $("#homeNotes").innerHTML = DB.notes.slice(0, 3).map(noteMarkup).join("");
    $("#notesWall").innerHTML = DB.notes.map(noteMarkup).join("");
    bindLightboxes();
  }

  function renderStories() {
    $("#storyList").innerHTML = DB.stories.map((story, index) => `
      <button class="story-row" data-open-story="${story.id}">
        <span class="num">0${index + 1}</span>
        <img src="${story.cover}" alt="${escapeHTML(story.title)}">
        <span>
          <h3>${escapeHTML(story.title)}</h3>
          <p>${escapeHTML(story.subtitle)}</p>
        </span>
        <time>${escapeHTML(story.date)}</time>
      </button>
    `).join("");
    bindStoryButtons();
  }

  function renderArchive() {
    const filtered = state.archiveFilter === "all"
      ? DB.stories
      : DB.stories.filter((story) => story.category === state.archiveFilter);
    $("#archiveList").innerHTML = filtered.map((story, index) => `
      <button class="archive-item" data-open-story="${story.id}">
        <span class="archive-year">${String(index + 1).padStart(2, "0")}</span>
        <span class="archive-category">${escapeHTML(story.category)}</span>
        <span class="archive-title">${escapeHTML(story.title)}</span>
        <span class="archive-date">${escapeHTML(story.date)}</span>
      </button>
    `).join("");
    $("#archiveEmpty").hidden = filtered.length > 0;
    bindStoryButtons();
  }

  function commentMarkup(comment) {
    return `
      <div class="comment">
        <strong>${escapeHTML(comment.author)} · ${escapeHTML(comment.time)}</strong>
        <p>${escapeHTML(comment.text)}</p>
      </div>
    `;
  }

  function renderStoryReader(story) {
    state.currentStory = story.id;
    const liked = Boolean(state.likes[story.id]);
    const comments = state.comments.filter((item) => item.storyId === story.id);
    const count = story.likes + (liked ? 1 : 0);
    $("#storyReader").innerHTML = `
      <img class="reader-cover" src="${story.cover}" alt="${escapeHTML(story.title)}">
      <div class="reader-body">
        <p class="kicker">${escapeHTML(story.issue)} · ${escapeHTML(story.place)}</p>
        <h2 id="storyDialogTitle">${escapeHTML(story.title)}</h2>
        <p>${escapeHTML(story.body)}</p>
        <div class="reader-gallery">
          ${story.images.slice(1).map((image, index) => `
            <button class="story-image" data-lightbox="${image}" aria-label="查看专题图片 ${index + 2}">
              <img src="${image}" alt="${escapeHTML(story.title)}的摄影作品">
            </button>
          `).join("")}
        </div>
        <p>我试着不去寻找决定性的瞬间，只记录人在城市里留下的轻微痕迹。它们没有结论，但会在下一次经过时，变成可以辨认的记忆。</p>
        <div class="reader-actions">
          <button class="outline-action like-button ${liked ? "is-liked" : ""}" id="likeButton">
            ${liked ? "已喜欢" : "喜欢"} · <span>${count}</span>
          </button>
          <button class="outline-action" id="shareButton">复制分享链接</button>
        </div>
        <section aria-labelledby="commentsTitle">
          <p class="kicker" id="commentsTitle">COMMENTS / 留言</p>
          <div class="comment-list" id="commentList">
            ${comments.length ? comments.map(commentMarkup).join("") : "<p class=\"empty-state\">还没有评论，写下第一条吧。</p>"}
          </div>
          <form class="comment-form" id="commentForm" novalidate>
            <input id="commentInput" type="text" maxlength="120" placeholder="写下你的感受">
            <button class="solid-action" type="submit">发布评论</button>
            <span class="comment-error" id="commentError"></span>
          </form>
        </section>
      </div>
    `;
    bindReaderInteractions(story);
    bindLightboxes();
  }

  function openStory(storyId) {
    const story = DB.stories.find((item) => item.id === storyId);
    if (!story) return;
    renderStoryReader(story);
    $("#storyDialog").showModal();
  }

  function bindReaderInteractions(story) {
    $("#likeButton").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      button.disabled = true;
      const nextLiked = !state.likes[story.id];
      const result = await window.PhotoAPI.toggleLike(story.id, nextLiked);
      state.likes[story.id] = result.liked;
      localStorage.setItem("photo-journal-likes", JSON.stringify(state.likes));
      button.classList.toggle("is-liked", result.liked);
      button.innerHTML = `${result.liked ? "已喜欢" : "喜欢"} · <span>${result.count}</span>`;
      button.disabled = false;
    });

    $("#shareButton").addEventListener("click", async () => {
      const shareText = `${story.title}｜余白个人影像刊物`;
      try {
        await navigator.clipboard.writeText(`${shareText}\n${location.href}`);
        showToast("分享链接已复制");
      } catch {
        showToast("原型提示：分享链接已准备");
      }
    });

    $("#commentForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const input = $("#commentInput");
      const error = $("#commentError");
      const button = event.currentTarget.querySelector("button");
      const value = input.value.trim();
      if (value.length < 2) {
        error.textContent = "至少写两个字再发布。";
        input.focus();
        return;
      }
      error.textContent = "";
      button.disabled = true;
      button.textContent = "发布中…";
      const comment = await window.PhotoAPI.createComment(story.id, value);
      state.comments.push(comment);
      localStorage.setItem("photo-journal-comments", JSON.stringify(state.comments));
      $("#commentList").innerHTML = state.comments
        .filter((item) => item.storyId === story.id)
        .map(commentMarkup)
        .join("");
      input.value = "";
      button.disabled = false;
      button.textContent = "发布评论";
      showToast("评论已发布");
    });
  }

  function bindStoryButtons() {
    $$("[data-open-story]").forEach((button) => {
      button.onclick = () => openStory(button.dataset.openStory);
    });
  }

  function bindLightboxes() {
    $$("[data-lightbox]").forEach((button) => {
      button.onclick = () => {
        $("#lightboxImage").src = button.dataset.lightbox;
        $("#lightbox").showModal();
      };
    });
  }

  function openStudio() {
    $("#studio").classList.add("is-open");
    $("#studio").setAttribute("aria-hidden", "false");
    $("#scrim").classList.add("is-visible");
  }

  function closeStudio() {
    $("#studio").classList.remove("is-open");
    $("#studio").setAttribute("aria-hidden", "true");
    $("#scrim").classList.remove("is-visible");
  }

  function setupStudio() {
    $("#studioOpen").addEventListener("click", openStudio);
    $("#studioClose").addEventListener("click", closeStudio);
    $("#scrim").addEventListener("click", closeStudio);

    const existingDraft = localStorage.getItem("photo-journal-draft");
    if (existingDraft) {
      const draft = JSON.parse(existingDraft);
      $("#postType").value = draft.type || "摄影专题";
      $("#postTitle").value = draft.title || "";
      $("#postBody").value = draft.body || "";
    }

    $("#saveDraft").addEventListener("click", async () => {
      await window.PhotoAPI.saveDraft({
        type: $("#postType").value,
        title: $("#postTitle").value,
        body: $("#postBody").value
      });
      showToast("草稿已保存在本机");
    });

    $("#publishForm").addEventListener("submit", async (event) => {
      event.preventDefault();
      const title = $("#postTitle").value.trim();
      if (title.length < 3) {
        $("#titleError").textContent = "标题至少需要三个字。";
        $("#postTitle").focus();
        return;
      }
      $("#titleError").textContent = "";
      const button = event.currentTarget.querySelector('[type="submit"]');
      button.disabled = true;
      button.textContent = "生成预览中…";
      await window.PhotoAPI.previewPost({
        type: $("#postType").value,
        title,
        body: $("#postBody").value.trim()
      });
      button.disabled = false;
      button.textContent = "预览发布";
      closeStudio();
      showToast("发布预览已生成，这是模拟操作");
    });
  }

  function init() {
    renderNotes();
    renderStories();
    renderArchive();
    bindStoryButtons();
    bindLightboxes();
    setupStudio();

    $$(".nav-link").forEach((button) => {
      button.addEventListener("click", () => setView(button.dataset.view));
    });
    $$(".filter").forEach((button) => {
      button.addEventListener("click", () => {
        state.archiveFilter = button.dataset.filter;
        $$(".filter").forEach((item) => item.classList.toggle("is-active", item === button));
        renderArchive();
      });
    });
    const menu = $("#mobileNav");
    const menuToggle = $("#menuToggle");
    const closeMobileMenu = () => {
      menu.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    };

    menuToggle.addEventListener("click", () => {
      const open = menu.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("pointerdown", (event) => {
      if (menu.classList.contains("is-open")
        && !menu.contains(event.target)
        && !menuToggle.contains(event.target)) {
        closeMobileMenu();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMobileMenu();
    });
    $$("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => $("#storyDialog").close());
    });
    $$("[data-close-lightbox]").forEach((button) => {
      button.addEventListener("click", () => $("#lightbox").close());
    });
    $("#storyDialog").addEventListener("click", (event) => {
      if (event.target === $("#storyDialog")) $("#storyDialog").close();
    });
    $("#lightbox").addEventListener("click", (event) => {
      if (event.target === $("#lightbox")) $("#lightbox").close();
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
