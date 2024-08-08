<template>
  <div id="wordcloud-container"></div>
</template>

<script lang="ts" setup>
import blogConfig from "config:blog";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import WordCloud from "wordcloud";

const props = defineProps({
  defaultActiveTag: {
    type: String,
  },
});
const activeTag = ref();
const emit = defineEmits(["onSelect"]);

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

// 创建一个简单的哈希函数
function hashCode(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // 转换为32位整数
  }
  return hash;
}

// 将哈希值映射到HSL颜色
function hashToHSL(hash: number) {
  const hue = Math.abs(hash) % 360; // 确保色相在0到360之间
  const lightness = 20 + (Math.abs(hash) % 30); // 亮度范围在40%到69%之间
  return `hsl(${hue}, 100%, ${lightness}%)`;
}

const renderCloud = () => {
  WordCloud.stop();
  const container = document.getElementById("wordcloud-container");
  if (container) {
    WordCloud(container, {
      list: tags.value.map((item) => [
        item.name,
        Math.max(Math.min(item.value, 10), 1) + 20,
      ]), // (1~10) + 20
      rotateRatio: 0,
      gridSize: 31,
      shrinkToFit: true,
      shuffle: false,
      classes: (word) => {
        if (!activeTag.value) {
          return "cloud-tag-all";
        }
        if (word === activeTag.value) {
          return "cloud-tag-active";
        }
        return "cloud-tag";
      },
      color(word) {
        const hash = hashCode(word);
        return hashToHSL(hash);
      },
      click: (entry) => {
        if (entry[0] !== activeTag.value) {
          activeTag.value = entry[0];
        } else {
          activeTag.value = undefined;
        }
        emit("onSelect", activeTag.value);
      },
    });
  }
};

onMounted(() => {
  activeTag.value = props.defaultActiveTag;
  renderCloud();
});

watch(activeTag, () => {
  renderCloud();
});

onBeforeUnmount(() => {
  WordCloud.stop();
});
</script>

<style>
#wordcloud-container {
  height: 300px;
  margin-top: 20px;
  margin-bottom: 20px;
}
.cloud-tag {
  opacity: 0.2;
}
.cloud-tag:hover,
.cloud-tag-active {
  cursor: pointer;
  opacity: 1;
  transform: scale(1.5) !important;
}
.cloud-tag-all {
  opacity: 1;
  cursor: pointer;
}
</style>
