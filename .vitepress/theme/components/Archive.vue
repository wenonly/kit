<template>
  <div class="timeline-wrap">
    <!-- 时间轴头部 -->
    <div class="timeline-header">
      <a-tag class="content">
        <template #icon>
          <svg
            class="icon"
            role="img"
            viewBox="0 0 1024 1024"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M832 64H192c-17.7 0-32 14.3-32 32v832c0 17.7 14.3 32 32 32h640c17.7 0 32-14.3 32-32V96c0-17.7-14.3-32-32-32z m-260 72h96v209.9L621.5 312 572 347.4V136z m220 752H232V136h280v296.9c0 3.3 1 6.6 3 9.3a15.9 15.9 0 0 0 22.3 3.7l83.8-59.9 81.4 59.4c2.7 2 6 3.1 9.4 3.1 8.8 0 16-7.2 16-16V136h64v752z"
            ></path>
          </svg>
        </template>
        共 {{ $articleData.length }} 篇，未完待续······
      </a-tag>
    </div>

    <!-- 时间轴主体 -->
    <div class="timeline-item" v-for="(item, year) in archiveData">
      <div class="year">
        <img
          class="chinese-zodiac"
          :src="
            '/img/svg/chinese-zodiac/' +
            getChineseZodiac(Number(year.replace('年', ''))) +
            '.svg'
          "
          :title="getChineseZodiacAlias(Number(year.replace('年', '')))"
          alt="生肖"
        />
        <span>{{ year }}</span>
      </div>
      <div class="timeline-item-content">
        <div v-for="(articles, month) in item">
          <span class="month">
            {{ month }}
          </span>
          <div class="articles">
            <span v-for="article in articles" class="article">
              <a :href="article.path" class="title" target="_self">{{
                article.title
              }}</a>
              <br />
              <ArticleMetadata :article="article" />
            </span>
          </div>
        </div>
      </div>
      <div id="main"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import blogConfig from "config:blog";
import ArticleMetadata from "./ArticleMetaData.vue";

// 文章原始数据和归档数据
let $articleData: ThemeType.ArticleData[];
let archiveData: Record<string, Record<string, ThemeType.ArticleData[]>>;

initTimeline();

/**
 * 初始化时间轴
 */
function initTimeline() {
  $articleData = [];
  archiveData = {};

  $articleData = blogConfig.map((article) => {
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

  // 文章数据归档处理
  // 1.对文章数据进行降序排序
  $articleData.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  // 2.按年、月进行归档
  for (let i = 0; i < $articleData.length; i++) {
    const article = $articleData[i];
    let year = new Date(article.date).getFullYear() + "年";
    let month = new Date(article.date).getMonth() + 1 + "月";

    if (!archiveData[year]) {
      archiveData[year] = {};
    }
    if (!archiveData[year][month]) {
      archiveData[year][month] = [];
    }

    archiveData[year][month].push(article);
  }
}

/**
 * 获取生肖
 */
function getChineseZodiac(year: number) {
  switch (year % 12) {
    case 0:
      return "monkey";
    case 1:
      return "rooster";
    case 2:
      return "dog";
    case 3:
      return "pig";
    case 4:
      return "rat";
    case 5:
      return "ox";
    case 6:
      return "tiger";
    case 7:
      return "rabbit";
    case 8:
      return "dragon";
    case 9:
      return "snake";
    case 10:
      return "horse";
    case 11:
      return "goat";
  }
}

/**
 * 获取生肖名称
 */
function getChineseZodiacAlias(year: number) {
  switch (year % 12) {
    case 0:
      return "猴年";
    case 1:
      return "鸡年";
    case 2:
      return "狗年";
    case 3:
      return "猪年";
    case 4:
      return "鼠年";
    case 5:
      return "牛年";
    case 6:
      return "虎年";
    case 7:
      return "兔年";
    case 8:
      return "龙年";
    case 9:
      return "蛇年";
    case 10:
      return "马年";
    case 11:
      return "羊年";
  }
}
</script>

<style scoped>
:deep(.arco-tag) {
  background-color: var(--vp-c-bg);
  color: var(--vp-c-text-1);
}
:deep(.arco-icon) {
  width: 1em;
  height: 1em;
}

.timeline-wrap {
  margin-top: 18px;
  word-break: break-all;
}

.timeline-wrap .timeline-header {
  padding-bottom: 20px;
}

.timeline-wrap .timeline-header .icon {
  fill: var(--vp-c-text-2);
  height: 18px;
  width: 18px;
}

.timeline-wrap .timeline-header .content {
  position: relative;
  left: -17px;
  font-size: 16px;
}

.timeline-wrap .timeline-item {
  padding: 0 0 0 20px;
  border-left: 1px solid #5d9df0;
  line-height: 1;
  position: relative;
}

.timeline-wrap .timeline-item:not(:last-child) {
  padding-bottom: 20px;
}

.timeline-wrap .timeline-item .year {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 0.6em;
}

.timeline-wrap .timeline-item .year .chinese-zodiac {
  display: inline-block;
  width: 20px;
  height: 20px;
  position: absolute;
  left: -10.5px;
  top: -1px;
  background: #fff;
  border: 1px solid #84b9e5;
  border-radius: 50%;
  cursor: pointer;
}

.timeline-wrap .timeline-item .timeline-item-time {
  margin-bottom: 12px;
  width: 200px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.timeline-wrap .timeline-item .month {
  padding: 8px 0 8px 0;
  display: block;
  color: var(--vp-c-text-1);
  font-size: 16px;
  font-weight: bold;
  position: relative;
}

.timeline-wrap .timeline-item .timeline-item-content {
  font-size: 14px;
}

.timeline-wrap .timeline-item .articles {
  line-height: 1;
  padding-top: 7px;
}

.timeline-wrap .timeline-item .articles .article {
  display: block;
  position: relative;
  margin-bottom: 20px;
  line-height: 1.5;
}

.timeline-wrap .timeline-item .articles svg {
  position: absolute;
  left: -27.5px;
  top: 3.5px;
  background: #fff;
  border: 1px solid #84b9e5;
  border-radius: 50%;
  cursor: pointer;
}

.timeline-wrap .timeline-item .articles .article span {
  color: var(--vp-c-text-2);
}

.vp-doc a {
  font-weight: 400;
  color: var(--vp-c-text-1);
}
.vp-doc a:hover {
  color: var(--vp-c-brand);
}
</style>
