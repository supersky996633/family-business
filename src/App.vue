<template>
  <router-view />
</template>

<script setup>
import { onMounted } from 'vue';
import { useAssetStore } from './store/assetStore.js';

const store = useAssetStore();
onMounted(() => {
  store.fetchAll();
});
</script>
