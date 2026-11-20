<script setup>
import { computed, ref } from 'vue'
import { COMPANY, monthlyTotal } from '../../../services/offerLetterService'
import { amountInWords, formatINR } from '../../../utils/format'
import { formatDate } from '../../../utils/date'

// A4 offer letter with JP Enterprises letterhead and Zepto partner branding.
// Page 1: the letter. Page 2: Annexure (salary + terms) and acceptance.
const props = defineProps({ letter: { type: Object, required: true } })

// Drop an official Zepto logo at public/zepto-logo.png to replace the text wordmark.
const ZEPTO_LOGO = "/zepto-logo.png"
const zeptoLogoFailed = ref(false)

const l = computed(() => props.letter)
const monthly = computed(() => monthlyTotal(l.value.salary))
const annual = computed(() => monthly.value * 12)
const firstName = computed(() => (l.value.candidateName || '').trim().split(' ')[0] || 'Candidate')
const terms = computed(() =>
  (l.value.terms || '')
    .split('\n')
    .map((t) => t.trim())
    .filter(Boolean),
)
const addressLines = computed(() =>
  (l.value.address || '')
    .split(/\n|,\s*(?=\S)/)
    .map((s) => s.trim())
    .filter(Boolean),
)
const d = (iso) => (iso ? formatDate(iso) : '__________')
const blank = (v, fallback = '__________') => (v === '' || v === null || v === undefined ? fallback : v)

const keyTerms = computed(() =>
  [
    ['Designation', blank(l.value.designation)],
    ['Department', l.value.department],
    ['Work location', l.value.location],
    ['Employment type', l.value.employmentType],
    ['Reporting to', l.value.reportingTo],
    ['Shift / timings', l.value.shift],
    ['Date of joining', d(l.value.joiningDate)],
    ['Probation period', l.value.probationMonths ? `${l.value.probationMonths} month(s)` : 'Not applicable'],
    ['Notice period', l.value.noticeDays ? `${l.value.noticeDays} days (after confirmation)` : ''],
    ['Gross salary', `${formatINR(monthly.value)} per month (${formatINR(annual.value)} per annum)`],
  ].filter(([, v]) => v),
)
</script>

<template>
  <div class="ol-doc ol-print-target">
    <!-- ================= PAGE 1 ================= -->
    <section class="ol-page">
      <header class="lh">
        <div class="lh-brand">
          <img src="/logo2.png" alt="" class="lh-logo" />
          <div>
            <div class="lh-name">JP <span>ENTERPRISES</span></div>
            <div class="lh-tag">{{ COMPANY.tagline }}</div>
          </div>
        </div>
        <div class="lh-partner">
          <small>In partnership with</small>
          <img v-if="!zeptoLogoFailed" :src="ZEPTO_LOGO" alt="Zepto" class="zepto-img" @error="zeptoLogoFailed = true" />
          <span v-else class="zepto-mark">zepto</span>
        </div>
      </header>
      <div class="lh-rule"><span /></div>

      <div class="body">
        <div class="meta">
          <div>
            <strong>Ref:</strong> {{ l.refNo || 'JPE/OL/—' }}
          </div>
          <div><strong>Date:</strong> {{ d(l.offerDate) }}</div>
        </div>

        <div class="to">
          <div>To,</div>
          <div class="to-name">{{ l.salutation }} {{ blank(l.candidateName, 'Candidate name') }}</div>
          <div v-for="(line, i) in addressLines" :key="i">{{ line }}</div>
          <div v-if="l.phone">Phone: {{ l.phone }}</div>
          <div v-if="l.email">Email: {{ l.email }}</div>
        </div>

        <h1 class="subject">Subject: Offer of Employment — {{ blank(l.designation, 'Designation') }}</h1>

        <p>Dear {{ firstName }},</p>
        <p>
          We are pleased to offer you the position of <strong>{{ blank(l.designation, 'Designation') }}</strong>
          <template v-if="l.department"> in the <strong>{{ l.department }}</strong> department</template>
          with <strong>JP Enterprises</strong>, operating Zepto dark stores as an authorised franchise and fulfilment
          partner<template v-if="l.location"> at <strong>{{ l.location }}</strong></template>. This letter sets out the
          key terms of our offer.
        </p>

        <table class="kv">
          <tbody>
            <tr v-for="[k, v] in keyTerms" :key="k">
              <th>{{ k }}</th>
              <td>{{ v }}</td>
            </tr>
          </tbody>
        </table>

        <p>
          The detailed salary structure and terms of employment are given in <strong>Annexure A</strong>. You are
          requested to report on your date of joining with originals and self-attested copies of your Aadhaar card,
          PAN card, bank passbook / cancelled cheque, recent passport-size photographs and educational certificates.
        </p>
        <p>
          Please sign and return a copy of this letter as a token of your acceptance on or before
          <strong>{{ d(l.acceptBy) }}</strong>, failing which this offer will stand withdrawn.
        </p>
        <p>We look forward to welcoming you to the team.</p>

        <div class="sign">
          <div>For <strong>JP Enterprises</strong></div>
          <div class="sign-space" />
          <div class="sign-name">{{ blank(l.signatoryName, 'Authorised signatory') }}</div>
          <div class="sign-title">{{ l.signatoryTitle }}</div>
        </div>
      </div>

      <footer class="ft">
        <span>{{ COMPANY.name }} · {{ COMPANY.address }}<template v-if="COMPANY.phone"> · {{ COMPANY.phone }}</template></span>
        <span>Page 1 of 2</span>
      </footer>
    </section>

    <!-- ================= PAGE 2 ================= -->
    <section class="ol-page">
      <header class="lh compact">
        <div class="lh-brand">
          <img src="/logo2.png" alt="" class="lh-logo" />
          <div class="lh-name">JP <span>ENTERPRISES</span></div>
        </div>
        <div class="lh-partner">
          <small>In partnership with</small>
          <img v-if="!zeptoLogoFailed" :src="ZEPTO_LOGO" alt="Zepto" class="zepto-img" @error="zeptoLogoFailed = true" />
          <span v-else class="zepto-mark">zepto</span>
        </div>
      </header>
      <div class="lh-rule"><span /></div>

      <div class="body">
        <h2 class="annex">Annexure A — Compensation &amp; terms</h2>
        <p class="annex-sub">
          {{ l.salutation }} {{ blank(l.candidateName, 'Candidate name') }} · {{ blank(l.designation, 'Designation') }} ·
          Ref {{ l.refNo || 'JPE/OL/—' }}
        </p>

        <table class="pay">
          <thead>
            <tr>
              <th>Component</th>
              <th class="num">Monthly (₹)</th>
              <th class="num">Annual (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in l.salary" :key="i">
              <td>{{ c.label }}</td>
              <td class="num">{{ formatINR(c.amount).replace('₹', '') }}</td>
              <td class="num">{{ formatINR((Number(c.amount) || 0) * 12).replace('₹', '') }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Gross salary</td>
              <td class="num">{{ formatINR(monthly) }}</td>
              <td class="num">{{ formatINR(annual) }}</td>
            </tr>
          </tfoot>
        </table>
        <p class="words">Annual gross in words: <strong>Rupees {{ amountInWords(annual) }} only</strong></p>

        <h3>Terms &amp; conditions</h3>
        <ol class="terms">
          <li v-for="(t, i) in terms" :key="i">{{ t }}</li>
        </ol>

        <div class="accept">
          <h3>Acceptance</h3>
          <p>
            I, {{ blank(l.candidateName, '____________________') }}, have read and understood the terms of this offer and
            accept the position of {{ blank(l.designation, '__________') }} with JP Enterprises. I will join on
            {{ d(l.joiningDate) }}.
          </p>
          <div class="sig-row">
            <div><span class="line" />Candidate signature</div>
            <div><span class="line" />Date</div>
            <div><span class="line" />Place</div>
          </div>
        </div>
      </div>

      <footer class="ft">
        <span>Confidential · {{ COMPANY.name }}</span>
        <span>Page 2 of 2</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
/* Paper colours are fixed (not theme tokens): this is what gets printed. */
.ol-doc {
  --navy: #14264f;
  --gold: #d3af37;
  --ink: #1f2430;
  --soft: #5b6273;
  --line: #dfe3ea;
  --zepto: #3c0e78;
  display: flex;
  flex-direction: column;
  gap: 24px;
  color: var(--ink);
  font-family: 'Segoe UI', Roboto, Arial, sans-serif;
}

.ol-page {
  width: 210mm;
  min-height: 297mm;
  background: #fff;
  display: flex;
  flex-direction: column;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
  position: relative;
  overflow: hidden;
}

/* Letterhead */
.lh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12mm 16mm 6mm;
}

.lh.compact {
  padding-top: 9mm;
  padding-bottom: 4mm;
}

.lh-brand {
  display: flex;
  align-items: center;
  gap: 4mm;
}

.lh-logo {
  width: 17mm;
  height: 17mm;
}

.compact .lh-logo {
  width: 11mm;
  height: 11mm;
}

.lh-name {
  font-size: 22pt;
  font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--navy);
  line-height: 1;
}

.lh-name span {
  color: var(--gold);
}

.compact .lh-name {
  font-size: 14pt;
}

.lh-tag {
  margin-top: 2mm;
  font-size: 8.5pt;
  color: var(--soft);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.lh-partner {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1mm;
}

.lh-partner small {
  font-size: 7pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--soft);
}

.zepto-img {
  height: 9mm;
  width: auto;
}

.compact .zepto-img {
  height: 7mm;
}

.zepto-mark {
  font-size: 22pt;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--zepto);
  line-height: 1;
}

.compact .zepto-mark {
  font-size: 15pt;
}

.lh-rule {
  height: 2.2mm;
  background: var(--navy);
  position: relative;
}

.lh-rule span {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 38%;
  background: var(--gold);
}

/* Body */
.body {
  flex: 1;
  padding: 8mm 18mm 6mm;
  font-size: 10pt;
  line-height: 1.55;
}

.body p {
  margin: 0 0 3mm;
  color: var(--ink);
}

.meta {
  display: flex;
  justify-content: space-between;
  font-size: 9.5pt;
  margin-bottom: 6mm;
}

.to {
  margin-bottom: 5mm;
  font-size: 9.5pt;
  line-height: 1.45;
}

.to-name {
  font-weight: 700;
  font-size: 10.5pt;
  color: var(--navy);
}

.subject {
  font-size: 11pt;
  font-weight: 700;
  color: var(--navy);
  margin: 0 0 4mm;
  letter-spacing: 0;
  text-decoration: underline;
  text-decoration-color: var(--gold);
  text-underline-offset: 3px;
}

.kv {
  width: 100%;
  border-collapse: collapse;
  margin: 2mm 0 5mm;
  font-size: 9.5pt;
}

.kv th,
.kv td {
  text-align: left;
  padding: 1.8mm 3mm;
  border-bottom: 1px solid var(--line);
  vertical-align: top;
  color: var(--ink);
}

.kv th {
  width: 38%;
  font-weight: 600;
  color: var(--soft);
  background: #f6f7fa;
}

.sign {
  margin-top: 8mm;
  font-size: 10pt;
}

.sign-space {
  height: 16mm;
}

.sign-name {
  font-weight: 700;
  color: var(--navy);
  border-top: 1px solid var(--ink);
  display: inline-block;
  padding-top: 1.5mm;
  min-width: 55mm;
}

.sign-title {
  color: var(--soft);
  font-size: 9pt;
}

/* Page 2 */
.annex {
  font-size: 13pt;
  color: var(--navy);
  margin: 0 0 1mm;
  letter-spacing: 0;
}

.annex-sub {
  color: var(--soft) !important;
  font-size: 9pt;
  margin-bottom: 5mm !important;
}

.pay {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}

.pay th {
  background: var(--navy);
  color: #fff;
  font-weight: 600;
  text-align: left;
  padding: 2.2mm 3mm;
}

.pay td {
  padding: 2mm 3mm;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
}

.pay tfoot td {
  font-weight: 700;
  color: var(--navy);
  background: #fbf6e6;
  border-top: 2px solid var(--gold);
  border-bottom: none;
}

.pay .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.words {
  font-size: 9pt;
  margin-top: 2mm !important;
  color: var(--soft) !important;
}

h3 {
  font-size: 11pt;
  color: var(--navy);
  margin: 6mm 0 2mm;
  letter-spacing: 0;
}

.terms {
  margin: 0;
  padding-left: 5mm;
  font-size: 9pt;
  line-height: 1.5;
}

.terms li {
  margin-bottom: 1.5mm;
  color: var(--ink);
}

.accept {
  margin-top: 6mm;
  padding: 4mm 5mm;
  border: 1px solid var(--line);
  border-left: 3px solid var(--gold);
  background: #fafbfc;
}

.accept h3 {
  margin-top: 0;
}

.sig-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 8mm;
  margin-top: 12mm;
  font-size: 8.5pt;
  color: var(--soft);
}

.line {
  display: block;
  border-top: 1px solid var(--ink);
  margin-bottom: 1mm;
}

/* Footer */
.ft {
  display: flex;
  justify-content: space-between;
  gap: 6mm;
  padding: 3.5mm 16mm;
  font-size: 7.5pt;
  color: #fff;
  background: var(--navy);
  border-top: 1.2mm solid var(--gold);
}
</style>
