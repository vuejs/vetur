<template lang="pug">
- var friends = 10;

case friends
  when 0
    p you have no friends
  when 1
    p you have a friend
  default
    p you have #{friends} friends
</template>
