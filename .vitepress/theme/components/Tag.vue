<template>
  <div class="main-container-tag">
    <word-cloud :default-active-tag="currentTag" @onSelect="onChange" />
    <div>
      <div class="tag-list">
        <div
          class="tag-item"
          v-for="(item, index) in articleFilterByTag"
          :key="index"
        >
          <div class="tag-item-name">
            <a :href="item.path">{{ item.title }}</a>
          </div>
          <ArticleMetadata :article="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import blogConfig from "config:blog";
import qs from "query-string";
import { computed, ref } from "vue";
import ArticleMetadata from "./ArticleMetaData.vue";
import WordCloud from "./WordCloud.vue";

const currentTag = ref();
currentTag.value = qs.parse(location.search)?.tag;

const articleData: ThemeType.ArticleData[] = blogConfig.map((article) => {
  return {
    title: article.title,
    author: "wenonly",
    path: article.to.replace(/\.md$/, ""),
    date: article.date,
    categories:
      typeof article.categories === "string"
        ? [article.categories]
        : article.categories,
    tags: article.tags,
  };
});

const articleFilterByTag = computed(() => {
  if(!currentTag.value) return articleData;
  return articleData.filter((item) => item.tags?.includes(currentTag.value));
});

const onChange = (tag: string) => {
  currentTag.value = tag;
  // 只改url，但是不刷新页面
  const url = new URL(window.location.href);
  url.searchParams.set("tag", tag);
  window.history.replaceState(null, "", url);
};
</script>

<style scoped>
.main-container-tag {
  max-width: 1152px;
  margin: 0 auto;
  margin-bottom: 20px;
}
.tag-list {
  display: flex;
  flex-direction: column;
  row-gap: 10px;
}
.tag-item {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 20px;
  border-radius: 3px;
}
</style>
