<script setup>
import { computed, ref } from 'vue'
import { COMPANY } from '../../../services/offerLetterService'
import { amountInWords, formatINR, maskAccount } from '../../../utils/format'
import { formatDate, formatMonth } from '../../../utils/date'

// One A4 salary slip with the JP Enterprises letterhead and Zepto partner branding.
// Pass several in one container and utils/pdf.js turns each .ol-page into a PDF page.
const props = defineProps({
  slip: { type: Object, required: true },
  printTarget: { type: Boolean, default: true },
})

const ZEPTO_LOGO = '/zepto-logo.png' // drop the official logo in public/ to replace the wordmark
const zeptoLogoFailed = ref(false)

const s = computed(() => props.slip)
const e = computed(() => s.value.employee || {})
const money = (n) => formatINR(n).replace('₹', '').trim()

const info = computed(() => [
  ['Employee name', e.value.name],
  ['Employee code', e.value.code],
  ['Designation', e.value.designation || '—'],
  ['Department', e.value.department || '—'],
  ['Date of joining', e.value.joiningDate ? formatDate(e.value.joiningDate) : '—'],
  ['PAN', e.value.pan || '—'],
  ['Bank', e.value.bankName || '—'],
  ['Account no.', e.value.accountNumber ? maskAccount(e.value.accountNumber) : '—'],
  ['Days in month', s.value.daysInMonth],
  ['Paid days', s.value.paidDays],
  ['Loss of pay days', s.value.lopDays],
  ['Payment', [s.value.paymentMode, s.value.paidOn ? formatDate(s.value.paidOn) : ''].filter(Boolean).join(' · ') || '—'],
])

const deductions = computed(() => (s.value.deductions || []).filter((d) => Number(d.amount) > 0))
const rows = computed(() => Math.max(s.value.earnings?.length || 0, deductions.value.length, 1))
const att = computed(() => s.value.attendance)
</script>

<template>
  <div class="ol-doc" :class="{ 'ol-print-target': printTarget }">
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
        <div class="title-row">
          <div>
            <h1>Salary slip</h1>
            <div class="period">{{ s.month ? `For the month of ${formatMonth(s.month)}` : '' }}</div>
          </div>
          <div class="slip-no">
            <small>Slip no.</small>
            <strong>{{ s.slipNo || 'DRAFT' }}</strong>
          </div>
        </div>

        <dl class="info">
          <div v-for="[k, v] in info" :key="k">
            <dt>{{ k }}</dt>
            <dd>{{ v }}</dd>
          </div>
        </dl>

        <table class="pay">
          <thead>
            <tr>
              <th>Earnings</th>
              <th class="num">Rate (₹)</th>
              <th class="num">Earned (₹)</th>
              <th class="split">Deductions</th>
              <th class="num">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="i in rows" :key="i">
              <td>{{ s.earnings[i - 1]?.label || '' }}</td>
              <td class="num muted">
                {{ s.earnings[i - 1] ? (s.earnings[i - 1].fixed ? '—' : money(s.earnings[i - 1].full)) : '' }}
              </td>
              <td class="num">{{ s.earnings[i - 1] ? money(s.earnings[i - 1].amount) : '' }}</td>
              <td class="split">{{ deductions[i - 1]?.label || (i === 1 && !deductions.length ? 'No deductions' : '') }}</td>
              <td class="num">{{ deductions[i - 1] ? money(deductions[i - 1].amount) : '' }}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td>Gross earnings</td>
              <td class="num muted">{{ money(s.fullGross) }}</td>
              <td class="num">{{ money(s.gross) }}</td>
              <td class="split">Total deductions</td>
              <td class="num">{{ money(s.totalDeductions) }}</td>
            </tr>
          </tfoot>
        </table>

        <div class="net">
          <div>
            <small>Net pay</small>
            <strong>{{ formatINR(s.net) }}</strong>
          </div>
          <p>Rupees {{ amountInWords(s.net) }} only</p>
        </div>

        <p v-if="s.note" class="slip-note"><b>Note:</b> {{ s.note }}</p>

        <div v-if="att" class="att">
          <span><b>{{ att.P }}</b> Present</span>
          <span><b>{{ att.HD }}</b> Half day</span>
          <span><b>{{ att.L }}</b> Leave</span>
          <span><b>{{ att.WO }}</b> Week off</span>
          <span><b>{{ att.A }}</b> Absent</span>
        </div>

        <div class="closing">
          <p class="note">
            This is a computer-generated salary slip and does not require a signature. Please report any discrepancy to
            your store manager within 7 days.
          </p>
          <div class="sign">
            <span class="line" />
            For JP Enterprises
          </div>
        </div>
      </div>

      <footer class="ft">
        <span>{{ COMPANY.name }} · {{ COMPANY.address }}</span>
        <span>Confidential</span>
      </footer>
    </section>
  </div>
</template>

<style scoped>
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
  overflow: hidden;
}

/* Letterhead — keep in sync with OfferLetterDocument.vue */
.lh {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12mm 16mm 6mm;
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

.zepto-mark {
  font-size: 22pt;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--zepto);
  line-height: 1;
}

.lh-rule {
  height: 2.2mm;
  background: var(--navy);
  position: relative;
}

.lh-rule span {
  position: absolute;
  inset: 0 62% 0 0;
  background: var(--gold);
}

/* Body */
.body {
  flex: 1;
  padding: 9mm 16mm 6mm;
  font-size: 9.5pt;
  line-height: 1.45;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 6mm;
}

h1 {
  margin: 0;
  font-size: 18pt;
  color: var(--navy);
  letter-spacing: 0;
}

.period {
  color: var(--soft);
  font-size: 10pt;
}

.slip-no {
  text-align: right;
}

.slip-no small {
  display: block;
  font-size: 7.5pt;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--soft);
}

.slip-no strong {
  font-family: Consolas, 'Courier New', monospace;
  color: var(--navy);
  font-size: 10pt;
}

.info {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  margin: 0 0 6mm;
  border: 1px solid var(--line);
  border-radius: 2mm;
  overflow: hidden;
}

.info div {
  padding: 2.2mm 3mm;
  border-bottom: 1px solid var(--line);
  border-right: 1px solid var(--line);
  background: #fff;
}

.info div:nth-child(4n) {
  border-right: none;
}

.info div:nth-last-child(-n + 4) {
  border-bottom: none;
}

.info dt {
  font-size: 7.5pt;
  color: var(--soft);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.info dd {
  margin: 0.5mm 0 0;
  font-weight: 600;
  color: var(--ink);
  overflow-wrap: anywhere;
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
  height: 7mm;
}

.pay .split {
  border-left: 2px solid var(--line);
}

.pay th.split {
  border-left-color: rgba(255, 255, 255, 0.25);
}

.pay .num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.pay .muted {
  color: var(--soft);
}

.pay tfoot td {
  font-weight: 700;
  color: var(--navy);
  background: #fbf6e6;
  border-top: 2px solid var(--gold);
  border-bottom: none;
}

.net {
  margin-top: 6mm;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6mm;
  padding: 4mm 6mm;
  background: var(--navy);
  color: #fff;
  border-left: 2mm solid var(--gold);
}

.net small {
  display: block;
  font-size: 8pt;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--gold);
}

.net strong {
  font-size: 20pt;
  line-height: 1.1;
  color: #fff;
}

.net p {
  margin: 0;
  max-width: 60%;
  text-align: right;
  font-size: 9pt;
  color: #e8ebf3;
}

.slip-note {
  margin: 4mm 0 0;
  font-size: 9pt;
  color: var(--ink);
}

.att {
  margin-top: 4mm;
  display: flex;
  gap: 6mm;
  flex-wrap: wrap;
  font-size: 8.5pt;
  color: var(--soft);
}

.att b {
  color: var(--ink);
}

.closing {
  margin-top: 14mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 10mm;
}

.note {
  margin: 0;
  max-width: 60%;
  font-size: 8pt;
  color: var(--soft);
}

.sign {
  min-width: 50mm;
  text-align: center;
  font-size: 8.5pt;
  color: var(--soft);
}

.line {
  display: block;
  border-top: 1px solid var(--ink);
  margin-bottom: 1mm;
}

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
