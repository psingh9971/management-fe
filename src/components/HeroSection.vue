<template>
  <section id="top" class="hero">
    <div class="container hero-inner">
      <span class="eyebrow">Zepto Franchise &amp; Fulfilment Partner</span>
      <h1>
        <img src="/logo2.png" alt="JP Enterprises" class="brand-logo" />
        <span class="brand-x">&times;</span>
        <span class="brand-zepto">ZEPTO</span>
      </h1>
      <p class="lead">
        Running fast, reliable quick-commerce dark stores across Ghaziabad &mdash; built on
        hands-on warehouse expertise, proven franchise operations and solid technology.
      </p>
      <div class="cta">
        <a href="#about" class="btn btn-primary">Know more</a>
        <a href="#contact" class="btn btn-outline">Contact us</a>
      </div>

      <ul class="stats">
        <li><strong>18+</strong><span>Years combined experience</span></li>
        <li><strong>2+</strong><span>Years as Zepto franchise</span></li>
        <li><strong>Multiple</strong><span>Stores operational</span></li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.hero {
  background:
    radial-gradient(60% 60% at 80% 0%, var(--accent-bg), transparent 70%),
    radial-gradient(50% 50% at 0% 100%, rgba(255, 46, 159, 0.08), transparent 70%);
  padding: 120px 0 96px;
}

.hero-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 24px;
}

h1 {
  font-size: clamp(48px, 9vw, 96px);
  line-height: 1;
  letter-spacing: -0.04em;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.25em;
}

.brand-logo {
  height: clamp(72px, 13vw, 132px);
  width: auto;
  display: block;
}

.brand-x {
  color: var(--accent);
  font-size: 0.6em;
}

.brand-zepto {
  background: linear-gradient(135deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.lead {
  max-width: 640px;
  font-size: 18px;
}

.cta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.stats {
  list-style: none;
  padding: 0;
  margin: 32px 0 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 720px;
}

.stats li {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stats strong {
  font-size: 26px;
  color: var(--text-h);
}

.stats span {
  font-size: 13px;
}

@media (max-width: 600px) {
  .hero {
    padding: 72px 0 56px;
  }
  .stats {
    grid-template-columns: 1fr;
  }

}
</style>
