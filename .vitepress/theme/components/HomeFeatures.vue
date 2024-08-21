<script lang="ts" setup>
import { withBase } from "vitepress";
const index = Math.floor(Math.random() * 26);
const data = [
  {
    title: "专注的力量",
    content:
      "“简单比复杂更难，你必须努力让你的想法变得清晰明了，让它变得简单。一旦你做到了简单，你就能搬动大山。” -- 乔布斯",
  },
  {
    title: "洞察的价值",
    content:
      "“我既没有突出的理解力，也没有过人的机智。只在觉察那些稍纵即逝的事物并对其进行精细观察的能力上，我可能在普通人之上。” -- 达尔文",
  },
  {
    title: "分享的智慧",
    content:
      "关于分享，有形的物品越分越少，无形的知识越分越多。在记录与分享的过程中, 梳理所学, 交流所得, 必有所获。",
  },
  {
    title: "创造力的源泉",
    content: "“创造力就是将不同的事物连接在一起。” -- 乔布斯",
  },
  {
    title: "坚持与成就",
    content:
      "“成功是坚持的结果，而坚持来自于对目标的信念和对过程的热爱。” -- 乔布斯",
  },
  {
    title: "观察与思考",
    content: "“我们不是因为问题而思考，而是因为思考而发现问题。” -- 达尔文",
  },
  {
    title: "不断学习",
    content:
      "“学习的过程从来不会结束。每一刻的学习都是为了更好地适应未来。” -- 爱因斯坦",
  },
  {
    title: "勇敢尝试",
    content: "“成功的秘诀在于不怕失败，勇敢尝试。” -- 史蒂夫·乔布斯",
  },
  {
    title: "行动与结果",
    content: "“你能做的唯一事情就是不断前进，不要停下来。” -- 乔布斯",
  },
  {
    title: "创新的力量",
    content: "“创新是领导者与跟随者之间的差距。” -- 史蒂夫·乔布斯",
  },
  {
    title: "追求卓越",
    content: "“追求卓越，你就会成功。” -- 乔布斯",
  },
  {
    title: "自信的力量",
    content: "“相信自己，你就能做到别人认为你做不到的事情。” -- 乔布斯",
  },
  {
    title: "简化的艺术",
    content: "“在复杂中找到简单，是一种艺术。” -- 乔布斯",
  },
  {
    title: "影响力",
    content: "“伟大的领袖是那些能够激励别人追随他们的人。” -- 乔布斯",
  },
  {
    title: "学习的乐趣",
    content: "“学习不仅是吸收知识，更是培养对未知的好奇心。” -- 爱因斯坦",
  },
  {
    title: "自我提升",
    content: "“成为你想成为的人，不断提升自己。” -- 爱因斯坦",
  },
  {
    title: "变革的勇气",
    content: "“变革不是偶然发生的，它需要勇气和毅力。” -- 乔布斯",
  },
  {
    title: "时间的价值",
    content: "“时间是最宝贵的资源，你无法浪费一分一秒。” -- 乔布斯",
  },
  {
    title: "热情的重要性",
    content: "“做你喜欢做的事情，你会更加投入和成功。” -- 乔布斯",
  },
  {
    title: "面对挑战",
    content: "“面对挑战，不要退缩，正是困难让你成长。” -- 爱因斯坦",
  },
  {
    title: "超越自我",
    content: "“突破自己的局限，你会发现无限的可能。” -- 乔布斯",
  },
  {
    title: "观察的力量",
    content: "“细致的观察往往能揭示出事物的本质。” -- 达尔文",
  },
  {
    title: "从错误中学习",
    content: "“从错误中学习，是成功的必经之路。” -- 爱因斯坦",
  },
  {
    title: "激情驱动",
    content: "“激情是你不断前进的动力。” -- 乔布斯",
  },
  {
    title: "实践的意义",
    content: "“理论和实践的结合才能产生真正的价值。” -- 爱因斯坦",
  },
  {
    title: "创新的勇气",
    content: "“真正的创新需要勇气去打破常规。” -- 乔布斯",
  },
  {
    title: "坚定信念",
    content: "“坚定的信念可以克服一切困难。” -- 乔布斯",
  },
  {
    title: "持续进步",
    content: "“持续的进步是成功的关键。” -- 爱因斯坦",
  },
  {
    title: "追求完美",
    content: "“追求完美虽然难，但值得尝试。” -- 乔布斯",
  },
  {
    title: "保持好奇",
    content: "“保持好奇心，可以让你不断发现新事物。” -- 爱因斯坦",
  },
  {
    title: "超越平凡",
    content: "“不要满足于平凡，要追求卓越。” -- 乔布斯",
  },
  {
    title: "寻找意义",
    content: "“寻找生活的意义，是每个人的追求。” -- 爱因斯坦",
  },
  {
    title: "从失败中崛起",
    content: "“从失败中崛起是成功的一部分。” -- 乔布斯",
  },
  {
    title: "知识的传递",
    content: "“分享知识是传递智慧的过程。” -- 达尔文",
  },
  {
    title: "自我激励",
    content: "“自我激励是成功的重要因素。” -- 乔布斯",
  },
].slice(index, index + 3);
</script>

<template>
  <div class="VPFeatures VPHomeFeatures">
    <div class="container">
      <div class="items">
        <div class="item" v-for="(item, index) in data" :key="index">
          <div class="VPLink no-icon VPFeature">
            <article class="box">
              <img style="width: 50px;margin-bottom: 10px;" :src="withBase('/img/svg/feature' + index + '.svg')" />
              <!--v-if-->
              <h2 class="title">{{ item.title }}</h2>
              <p class="details">
                {{ item.content }}
              </p>
              <!--v-if-->
            </article>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.VPFeatures {
  position: relative;
  padding: 0 24px;
}
.container {
  margin: 0 auto;
  max-width: 1152px;
}
.items {
  display: flex;
  flex-wrap: wrap;
  margin: -8px;
}
.item {
  padding: 8px;
  width: 100%;
  flex: 1;
}
.VPFeature {
  display: block;
  border: 1px solid var(--vp-c-bg-soft);
  border-radius: 12px;
  height: 100%;
  background-color: var(--vp-c-bg-soft);
  transition: border-color 0.25s, background-color 0.25s;
}
.box {
  display: flex;
  flex-direction: column;
  padding: 24px;
  height: 100%;
}
.title {
  line-height: 24px;
  font-size: 16px;
  font-weight: 600;
  overflow-wrap: break-word;
}
.details {
  flex-grow: 1;
  padding-top: 8px;
  line-height: 24px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-2);
  overflow-wrap: break-word;
}
</style>
