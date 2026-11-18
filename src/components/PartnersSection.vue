<script setup>
const partners = [
  {
    name: 'Parvinder Singh',
    initials: 'PS',
    role: 'Partner — Technology & Franchise Operations',
    bio: 'Software engineer with 6+ years of experience, MIT Pune alumnus. Leads technology and the systems that run our stores.',
  },
  {
    name: 'Jaideep Singh',
    initials: 'JS',
    role: 'Partner — Inventory & Franchise Operations',
    bio: '6+ years across multiple warehouses in inventory. Former Zepto Inventory Manager, currently with Flipkart.',
  },
  {
    name: 'Eklavya Dixit',
    initials: 'ED',
    role: 'Partner — Franchise Operations',
    bio: 'Zepto franchise partner for the last 2 years, owning and operating multiple stores.',
  },
]
</script>

<template>
  <section id="partners">
    <div class="container">
      <span class="eyebrow">Our partners</span>
      <h2>The team behind JP x ZEPTO</h2>
      <div class="grid">
        <article v-for="p in partners" :key="p.name" class="card">
          <div class="avatar">{{ p.initials }}</div>
          <h3>{{ p.name }}</h3>
          <span class="role">{{ p.role }}</span>
          <p>{{ p.bio }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
h2 {
  font-size: clamp(28px, 4vw, 40px);
  margin: 16px 0 0;
}

.grid {
  margin-top: 40px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: border-color 0.2s, transform 0.2s;
}

.card:hover {
  border-color: var(--accent-border);
  transform: translateY(-3px);
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 800;
  color: #fff;
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  margin-bottom: 8px;
}

.card h3 {
  font-size: 20px;
}

.role {
  font-size: 13px;
  font-weight: 700;
  color: var(--accent);
}
</style>
