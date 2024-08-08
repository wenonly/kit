---
layout: page
---

<script setup>
import { defineClientComponent } from 'vitepress'

const Tag = defineClientComponent(() => import('@/.vitepress/theme/components/Tag.vue'))
</script>

<Tag/>
