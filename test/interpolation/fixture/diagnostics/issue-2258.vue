<template>
  <mcOssfileView>
    <template v-slot="{item}">{{item.name}}</template>
    <template v-slot:after="item">
      <div class="info-bar">
        <div class="text">{{item.name}}</div>
      </div>
    </template>
  </mcOssfileView>
</template>
