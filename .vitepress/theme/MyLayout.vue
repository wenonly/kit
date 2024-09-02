<!--.vitepress/theme/MyLayout.vue-->
<script lang="ts" setup>
import Gitalk from "gitalk";
import "gitalk/dist/gitalk.css";
import { defineClientComponent, useData, withBase, useRoute } from "vitepress";
import DefaultTheme from "vitepress/theme";
import { onMounted, ref, watch } from "vue";
import ArticleMetaData from "./components/ArticleMetaData.vue";
import HomeFeatures from "./components/HomeFeatures.vue";
import sha256 from "crypto-js/sha256";
import EncHex from "crypto-js/enc-hex";
const WordCloud = defineClientComponent(
  () => import("./components/WordCloud.vue")
);

const { Layout } = DefaultTheme;

const { frontmatter } = useData();

const onTagClick = (tag: string) => {
  location.href = withBase(`/tag?tag=${tag}`);
};

const gitalkRef = ref<HTMLDivElement>();

const renderGitalk = () => {
  if (!gitalkRef.value) return;
  gitalkRef.value.innerHTML = '';
  const gitalk = new Gitalk({
    clientID: "Ov23liMOutAMqp7zubFX",
    clientSecret: "4c5bf0b63ee73a08e6fc0ec65e8bcf5271f6f8f5",
    repo: "kit", // The repository of store comments,
    owner: "wenonly",
    admin: ["wenonly"],
    id: sha256(location.pathname).toString(EncHex).slice(0, 16), // Ensure uniqueness and length less than 50
    distractionFreeMode: false, // Facebook-like distraction free mode
  });
  gitalk.render(gitalkRef.value);
}

onMounted(() => {
  renderGitalk();
});

const route = useRoute();

watch(
  () => route.path,
  () => {
    renderGitalk(); // Re-render Gitalk on every route change
  }
);
</script>

<template>
  <Layout>
    <template v-if="frontmatter.date" #doc-before>
      <h1 class="title">{{ frontmatter.title }}</h1>
      <article-meta-data />
    </template>
    <template #home-features-after>
      <ClientOnly>
        <home-features />
      </ClientOnly>
      <br />
      <br />
      <word-cloud @onSelect="onTagClick" />
    </template>
    <template #doc-after>
      <div ref="gitalkRef"></div>
    </template>
  </Layout>
</template>

<style scoped>
.title {
  letter-spacing: -0.02em;
  line-height: 40px;
  font-size: 32px;
  font-weight: 600;
}

.meta-wrapper {
  margin-top: 10px;
}

.meta-item {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
  max-width: 240px;
  color: var(--vp-c-text-2);
  cursor: default;
  font-size: 14px;
}

.meta-item:not(:last-child) {
  margin-right: 1rem;
}

.meta-icon,
meta-content {
  display: inline-block;
  margin-right: 0.375rem;
  vertical-align: middle;
}

.meta-icon {
  position: relative;
  bottom: 1.5px;
}

.meta-icon.date {
  bottom: 1.3px;
}

.meta-icon svg {
  fill: var(--vp-c-text-2);
  height: 16px;
  width: 16px;
}

.meta-content a {
  font-weight: 400;
  color: var(--vp-c-text-2);
}

/* .meta-content a:hover {
  color: var(--vp-c-brand);
} */
</style>
