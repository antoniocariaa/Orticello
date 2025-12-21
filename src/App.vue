<script setup>
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen bg-base-200 font-sans overflow-x-hidden">
    <!-- Simple Navbar if needed in future, currently just content -->
    <div class="navbar bg-base-100 shadow-sm w-full">
      <div class="flex-1">
        <a class="btn btn-ghost text-xl text-primary font-bold">Orticello</a>
      </div>
    </div>

    <div class="w-full px-4 flex justify-center items-start pt-10 pb-10">
       <RouterView />
    </div>
  </div>
</template>