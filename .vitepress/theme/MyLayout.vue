<!--.vitepress/theme/MyLayout.vue-->
<script lang="ts" setup>
import DefaultTheme from "vitepress/theme";
import { defineClientComponent, useData, withBase } from "vitepress";
import ArticleMetaData from "./components/ArticleMetaData.vue";
import HomeFeatures from "./components/HomeFeatures.vue";
const WordCloud = defineClientComponent(
  () => import("./components/WordCloud.vue")
);

const { Layout } = DefaultTheme;

const { frontmatter } = useData();

const onTagClick = (tag: string) => {
  location.href = withBase(`/tag?tag=${tag}`);
};
</script>

<template>
  <Layout>
    <template v-if="frontmatter.title" #doc-before>
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
