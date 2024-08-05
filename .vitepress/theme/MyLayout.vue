<!--.vitepress/theme/MyLayout.vue-->
<script setup>
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { watchEffect } from "vue";

const { Layout } = DefaultTheme;

const { frontmatter } = useData();
</script>

<template>
  <Layout>
    <template #doc-before>
      <h1 class="title">{{ frontmatter.title }}</h1>
      <!-- <div class="info">
        <span>{{ frontmatter.categories }}</span>
        <span>{{ frontmatter.date }}</span>
      </div> -->
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
</style>
