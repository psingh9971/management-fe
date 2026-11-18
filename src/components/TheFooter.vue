<script setup>
import BrandLogo from './BrandLogo.vue'
const year = new Date().getFullYear()
</script>

<template>
  <footer id="contact" class="footer">
    <div class="container footer-grid">
      <div>
        <BrandLogo :height="48" />
        <p class="tagline">Zepto franchise &amp; fulfilment partner.</p>
      </div>

      <div>
        <h4>Registered office</h4>
        <address>
          960, Surajmal Enclave,<br />
          Sector-23, Ghaziabad,<br />
          Uttar Pradesh &ndash; 201001
        </address>
      </div>

      <div>
        <h4>Business details</h4>
        <p>GSTIN: <strong>33FHGHH2A</strong></p>
      </div>
    </div>
    <div class="container copyright">
      &copy; {{ year }} JP x ZEPTO. All rights reserved.
    </div>
  </footer>
</template>

<style scoped>
.footer {
  background: var(--bg-soft);
  border-top: 1px solid var(--border);
  padding: 56px 0 24px;
}

.footer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 32px;
}

.tagline {
  margin-top: 12px;
  font-size: 14px;
}

h4 {
  margin: 0 0 10px;
  color: var(--text-h);
  font-size: 15px;
}

address {
  font-style: normal;
  line-height: 1.7;
}

.copyright {
  margin-top: 40px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}
</style>
