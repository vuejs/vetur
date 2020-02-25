<template>
  <div></div>
</template>

<script>
import logger from '@/logger';
import other from '@/notFound';

switch (Math.random() * 3) {
  case 1:
    logger.info('1');
  case 2:
    logger.info('2');
    break;
}
</script>
