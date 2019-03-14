<template>
  <div class="user-view">
    <template v-if="user">
      <h1>User : {{ user.id }}</h1>
      <ul class="meta">
        <li>
          <span class="label">Created:</span>
          {{ user.created | timeAgo }} ago
        </li>
        <li>
          <span class="label">Karma:</span>
          {{ user.karma }}
        </li>
        <li v-if="user.about" v-html="user.about" class="about"></li>
      </ul>
      <p class="links">
        <a :href="'https://news.ycombinator.com/submitted?id=' + user.id">submissions</a> |
        <a :href="'https://news.ycombinator.com/threads?id=' + user.id">comments</a>
      </p>
    </template>
    <template v-else-if="user === false">
      <h1>User not found.</h1>
    </template>
  </div>
</template>
