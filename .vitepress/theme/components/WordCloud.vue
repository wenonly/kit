<template>
  <div id="wordcloud-container"></div>
</template>

<script lang="ts" setup>
import { WordCloud } from "@antv/g2plot";
import blogConfig from "config:blog";
import { computed, onBeforeUnmount, onMounted } from "vue";

const tags = computed(() => {
  const tgs = blogConfig.map((item) => item.tags ?? []).flat();
  const tagsMap: Record<string, number> = {};
  tgs.forEach((t) => {
    if (tagsMap[t]) {
      tagsMap[t]++;
    } else {
      tagsMap[t] = 1;
    }
  });
  return Object.entries(tagsMap).map(([name, value]) => ({ name, value }));
});

// 渲染WordCloud
let wordCloud;
onMounted(() => {
  wordCloud = new WordCloud("wordcloud-container", {
    data: tags.value,
    wordField: "name",
    weightField: "value",
    colorField: "name",
    wordStyle: {
      fontFamily: "Verdana",
      fontSize: [18, 45],
      rotation: 0,
      padding: 10,
    },
    // 返回值设置成一个 [0, 1) 区间内的值，
    // 可以让每次渲染的位置相同（前提是每次的宽高一致）。
    random: () => (Math.random() * 5 + 2.5) / 10,
  });
  wordCloud.render();
});

onBeforeUnmount(() => {
  wordCloud.destroy();
});
</script>
