(function () {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  window.PhotoAPI = {
    // TODO: replace with POST /api/stories/:id/likes
    async toggleLike(storyId, liked) {
      await delay(360);
      const story = window.PHOTO_DB.stories.find((item) => item.id === storyId);
      return { success: true, liked, count: story.likes + (liked ? 1 : 0) };
    },

    // TODO: replace with POST /api/stories/:id/comments
    async createComment(storyId, text) {
      await delay(520);
      return {
        id: Date.now(),
        storyId,
        author: "访客",
        text,
        time: "刚刚"
      };
    },

    // TODO: replace with POST /api/posts/drafts
    async saveDraft(payload) {
      await delay(420);
      localStorage.setItem("photo-journal-draft", JSON.stringify(payload));
      return { success: true };
    },

    // TODO: replace with POST /api/posts/preview
    async previewPost(payload) {
      await delay(680);
      return { success: true, previewId: "preview-" + Date.now(), payload };
    }
  };
})();
