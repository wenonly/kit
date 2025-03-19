<template>
  <div class="bg-white rounded-xl p-12 max-w-[1152px] mx-auto">
    <h3 class="text-2xl! font-semibold! mb-8! text-center">技术标签</h3>
    <div class="tag-cloud flex flex-wrap justify-center gap-4">
      <span
        v-for="(tag, index) in tags"
        :key="index"
        class="text-primary cursor-pointer text-blue-300 text-2xl hover:scale-110"
        :style="formatStyle(tag.name)"
        @click="onClick(tag.name)"
        >{{ tag.name }}</span
      >
    </div>
  </div>
</template>

<script lang="ts" setup>
import blogConfig from "config:blog";
import { computed, onMounted, ref } from "vue";

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
  console.log(tagsMap);
  return Object.entries(tagsMap).map(([name, value]) => ({
    name,
    value,
    color: hashToHSL(hashCode(name)),
  }));
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

const onClick = (name: string) => {
  if (name === activeTag.value) {
    activeTag.value = undefined;
  } else {
    activeTag.value = name;
  }
  emit("onSelect", activeTag.value);
};

const formatStyle = (tag: string) => {
  if (activeTag.value && activeTag.value !== tag) {
    return { transform: "scale(0.8)" };
  }
  return {
    color: hashToHSL(hashCode(tag)),
  };
};

onMounted(() => {
  activeTag.value = props.defaultActiveTag;
});
</script>
