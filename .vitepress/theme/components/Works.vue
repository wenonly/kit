<template>
  <div class="relative container my-6 mx-auto px-4">
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      <div v-for="(image, index) in images" :key="index" class="aspect-square">
        <el-image
          :src="image.url"
          :alt="image.alt"
          lazy
          fit="cover"
          :class="[
            'w-full h-full object-cover rounded-lg shadow-md hover:shadow-xl transition-all duration-300',
            { 'blur-sm': !isAuthenticated }
          ]"
          :initial-index="index"
          :preview-src-list="isAuthenticated ? images.map(image => image.url): undefined"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { imagesMap } from '../assets/works';

const isAuthenticated = ref(false);
const CORRECT_PASSWORD = 'wen12123';

onMounted(() => {
  // 检查 sessionStorage 中是否已认证
  if (sessionStorage.getItem('isAuthenticated')) {
    isAuthenticated.value = true;
    return;
  }

  console.log(imagesMap)
  
  const password = window.prompt('请输入密码查看清晰图片：');
  if (password === CORRECT_PASSWORD) {
    isAuthenticated.value = true;
    sessionStorage.setItem('isAuthenticated', 'true');
  }
});

const images = computed(() => {
  const images = [];
  for (const key in imagesMap) {
    images.push({
      url: imagesMap[key],
      alt: key
    });
  }
  return images;
});
</script>

<style scoped>
.el-image {
  --el-image-placeholder-bg: #f5f7fa;
}
</style>