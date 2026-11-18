<script setup>
const pillars = [
  {
    title: 'Store operations',
    text: 'Multi-store Zepto franchise operations with tight SLAs, staffing and daily execution.',
  },
  {
    title: 'Inventory excellence',
    text: 'Warehouse and inventory management practices honed at Zepto and Flipkart.',
  },
  {
    title: 'Technology',
    text: 'In-house software to track stock, people and performance across every store.',
  },
]
</script>

<template>
  <section id="about" class="about">
    <div class="container">
      <span class="eyebrow">About us</span>
      <h2>Quick commerce, run by people who know it inside out</h2>
      <p class="intro">
        JP x ZEPTO is a partnership that brings together store operations, supply-chain and
        software experience to run and scale Zepto dark stores efficiently.
      </p>
      <div class="grid">
        <article v-for="p in pillars" :key="p.title" class="card">
          <h3>{{ p.title }}</h3>
          <p>{{ p.text }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about {
  background: var(--bg-soft);
}

h2 {
  font-size: clamp(28px, 4vw, 40px);
  margin: 16px 0 12px;
  max-width: 720px;
}

.intro {
  max-width: 680px;
  font-size: 17px;
}

.grid {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  box-shadow: var(--shadow);
}

.card h3 {
  font-size: 19px;
  margin-bottom: 8px;
}
</style>
