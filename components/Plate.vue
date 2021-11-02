<template>
  <p style="writing-mode:vertical-rl;" :class="'p' + plate">{{ plate }}</p>
</template>
<script>
export default {
  props: ['plate'],
};
</script>
