<template>
  <div id="wordcloud-container"></div>
</template>

<script lang="ts" setup>
import { WordCloud } from "@antv/g2plot";
import blogConfig from "config:blog";
import {
  computed,
  defineEmits,
  onBeforeUnmount,
  onMounted,
  ref,
  defineProps,
} from "vue";

const props = defineProps({
  activeTag: {
    type: String,
  },
});
const activeTag = ref();
const onSelect = defineEmits<(tag: string) => void>();

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
let wordCloud: WordCloud;
onMounted(() => {
  activeTag.value = props.activeTag;
  wordCloud = new WordCloud("wordcloud-container", {
    data: tags.value,
    wordField: "name",
    weightField: "value",
    colorField: "name",
    interactions: [
      {
        enable: true,
        type: "element-active",
      },
      {
        enable: true,
        type: "element-selected",
      },
    ],
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
  let previousSelectedElement:
    | (typeof chart.geometries)[0]["elements"][0]
    | undefined;
  const chart = wordCloud.chart;

  const findTagElementFromChart = (text: string) => {
    return chart.geometries
      .flatMap((geom) => geom.elements)
      .find((element) => element.getData().text === text);
  };

  // 如果初始化参数中包含activeTag，则选中
  if (activeTag.value) {
    const element = findTagElementFromChart(activeTag.value);
    if (element) {
      element.setState("selected", true);
      previousSelectedElement = element;
    }
  }

  wordCloud.on("element:mouseenter", ({ gEvent }) => {
    gEvent.currentTarget.attr("cursor", "pointer");
  });

  // 电机的时候选中新的
  wordCloud.on("element:click", (event) => {
    const clickTag = event.gEvent.currentTarget.attr("text");
    const currentElement = findTagElementFromChart(clickTag);
    // 执行点击
    onSelect?.(clickTag);

    // 取消上一个选中的元素的选中状态
    if (previousSelectedElement && previousSelectedElement !== currentElement) {
      chart.geometries
        .flatMap((geom) => geom.elements)
        .forEach((element) => {
          if (
            element.getData().name === previousSelectedElement?.getData().name
          ) {
            element.setState("selected", false);
          }
        });
    }

    // 设置当前元素为选中状态
    currentElement?.setState("selected", true);

    // 记录当前选中的元素
    previousSelectedElement = currentElement;
  });
});

onBeforeUnmount(() => {
  wordCloud.destroy();
});
</script>
