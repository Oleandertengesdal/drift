<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue";
import { apiClient } from "@/api/client";
import { useRouter } from "vue-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import {
  isAfter,
  isEqual,
  startOfDay,
  startOfMinute,
  subDays,
  subYears,
} from "date-fns";

type KioskView = "stats" | "leaderboard" | "register";
const activeView = ref<KioskView>("stats");

const router = useRouter();
const queryClient = useQueryClient();

const now = ref(startOfMinute(new Date()));
const lastYear = computed(() => startOfDay(subYears(now.value, 1)));
const last7Days = computed(() => startOfDay(subDays(now.value, 7)));
const last30Days = computed(() => startOfDay(subDays(now.value, 30)));

const parseDate = (value?: string) => (value ? new Date(value) : null);

const parseQuantity = (value?: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatNumber = (value: number) =>
  new Intl.NumberFormat("no-NO").format(Math.round(value));

const getPurchaseItemCount = (purchase: any) => {
  if (!Array.isArray(purchase?.products)) return 0;
  return purchase.products.reduce((sum: number, product: any) => {
    return sum + parseQuantity(product?.quantity);
  }, 0);
};

const buildPopularItems = (purchaseList: any[], limit = 10) => {
  const totals = new Map<string, number>();

  purchaseList.forEach((purchase) => {
    if (!Array.isArray(purchase?.products)) return;

    purchase.products.forEach((product: any) => {
      const baseName =
        product?.name || product?.variantName || "Ukjent produkt";
      const variant =
        product?.variantName && product?.name ? `${product.variantName}` : null;
      const label = variant ? `${baseName} (${variant})` : baseName;
      const quantity = parseQuantity(product?.quantity);
      if (quantity <= 0) return;
      totals.set(label, (totals.get(label) || 0) + quantity);
    });
  });

  return Array.from(totals.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

const exitFullscreen = () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  }
  router.push("/");
};

const {
  data: purchases,
  isPending,
  isError,
  error,
  refetch,
} = useQuery({
  queryKey: ["zettle", "purchases", lastYear.value.toISOString(), now.value],
  queryFn: () =>
    apiClient.api.zettle.purchases
      .$get({
        query: {
          startDate: lastYear.value.toISOString(),
          endDate: now.value.toISOString(),
        },
      })
      .then((res) => res.json()),
});

// ---------------------------------------------------------------------------
// Filtered purchases for stats
// ---------------------------------------------------------------------------
const lastYearPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, lastYear.value) : false;
  });
});

const last7DaysPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, last7Days.value) : false;
  });
});

const last30DaysPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, last30Days.value) : false;
  });
});

const totalItemsLast7Days = computed(() =>
  last7DaysPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsLast30Days = computed(() =>
  last30DaysPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsLastYear = computed(() =>
  lastYearPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const popularItemsLast7Days = computed(() =>
  buildPopularItems(last7DaysPurchases.value),
);

const popularItemsLast30Days = computed(() =>
  buildPopularItems(last30DaysPurchases.value),
);

const popularItemsLastYear = computed(() =>
  buildPopularItems(lastYearPurchases.value),
);

const {
  data: registrations,
  isPending: registrationsPending,
} = useQuery({
  queryKey: ["zettle", "leaderboard", "registrations"],
  queryFn: () =>
    apiClient.api.zettle.leaderboard.registrations
      .$get()
      .then((res) => res.json()),
  refetchInterval: 30_000,
});

const registerName = ref("");
const selectedPan = ref<string | null>(null);
const registerSuccess = ref(false);
const registerError = ref<string | null>(null);

/** Extract unique card PANs from today's purchases for registration picker */
const todaysCardPayments = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];

  const today = startOfDay(new Date());
  const seen = new Map<
    string,
    { maskedPan: string; cardType?: string; time: string; amount?: number }
  >();

  purchases.value
    .filter((p) => {
      const ts = parseDate(p.timestamp);
      return ts ? isAfter(ts, today) : false;
    })
    .forEach((p) => {
      if (!Array.isArray(p.payments)) return;
      p.payments.forEach((pay) => {
        const pan = pay.cardAttributes?.maskedPan;
        if (!pan) return;
        // Keep the most recent occurrence
        if (!seen.has(pan)) {
          seen.set(pan, {
            maskedPan: pan,
            cardType: pay.cardAttributes?.cardType,
            time: p.timestamp ?? "",
            amount: pay.amount,
          });
        }
      });
    });

  return Array.from(seen.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
  );
});

/** Last 4 digits from a masked PAN */
const last4 = (pan: string) => pan.slice(-4);

const isAlreadyRegistered = (pan: string) => {
  if (!registrations.value) return false;
  return pan in registrations.value;
};

const registerMutation = useMutation({
  mutationFn: async (payload: { maskedPan: string; displayName: string }) => {
    const res = await apiClient.api.zettle.leaderboard.register.$post({
      json: payload,
    });
    return res.json();
  },
  onSuccess: () => {
    registerSuccess.value = true;
    registerError.value = null;
    selectedPan.value = null;
    registerName.value = "";
    queryClient.invalidateQueries({
      queryKey: ["zettle", "leaderboard", "registrations"],
    });
    setTimeout(() => {
      registerSuccess.value = false;
    }, 4000);
  },
  onError: (err: any) => {
    registerError.value = err?.message ?? "Noe gikk galt";
  },
});

const submitRegistration = () => {
  if (!selectedPan.value || !registerName.value.trim()) return;
  registerMutation.mutate({
    maskedPan: selectedPan.value,
    displayName: registerName.value.trim(),
  });
};

type LeaderboardEntry = {
  displayName: string;
  purchaseCount: number;
  totalAmount: number;
};

const buildLeaderboard = (
  purchaseList: any[],
  regs: Record<string, { displayName: string; registeredAt: string }>,
): LeaderboardEntry[] => {
  const stats = new Map<
    string,
    { purchaseCount: number; totalAmount: number }
  >();

  purchaseList.forEach((purchase) => {
    if (!Array.isArray(purchase.payments)) return;

    // Find the card PAN for this purchase (first card payment)
    let pan: string | undefined;
    let amount = 0;
    for (const pay of purchase.payments) {
      if (pay.cardAttributes?.maskedPan) {
        pan = pay.cardAttributes.maskedPan;
        amount = pay.amount ?? purchase.amount ?? 0;
        break;
      }
    }

    if (!pan || !(pan in regs)) return;

    const existing = stats.get(pan) ?? { purchaseCount: 0, totalAmount: 0 };
    existing.purchaseCount += 1;
    existing.totalAmount += amount;
    stats.set(pan, existing);
  });

  return Array.from(stats.entries())
    .map(([pan, s]) => ({
      displayName: regs[pan]!.displayName,
      purchaseCount: s.purchaseCount,
      totalAmount: s.totalAmount,
    }))
    .sort((a, b) => b.purchaseCount - a.purchaseCount);
};

const leaderboard7Days = computed(() => {
  if (!registrations.value) return [];
  return buildLeaderboard(last7DaysPurchases.value, registrations.value);
});

const leaderboard30Days = computed(() => {
  if (!registrations.value) return [];
  return buildLeaderboard(last30DaysPurchases.value, registrations.value);
});

const leaderboardYear = computed(() => {
  if (!registrations.value) return [];
  return buildLeaderboard(lastYearPurchases.value, registrations.value);
});

onMounted(() => {
  const intervalId = setInterval(() => {
    const newValue = startOfMinute(new Date());
    if (isEqual(now.value, newValue)) return;
    now.value = newValue;
  }, 1000);

  return () => clearInterval(intervalId);
});
</script>

<template>
  <div class="internal-kiosk-screen">
    <button @click="exitFullscreen" class="close-btn">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>

    <!-- ── Navigation bar ── -->
    <nav class="kiosk-nav">
      <button
        :class="['nav-btn', { active: activeView === 'stats' }]"
        @click="activeView = 'stats'"
      >
        Statistikk
      </button>
      <button
        :class="['nav-btn', { active: activeView === 'leaderboard' }]"
        @click="activeView = 'leaderboard'"
      >
        Toppliste
      </button>
      <button
        :class="['nav-btn', { active: activeView === 'register' }]"
        @click="activeView = 'register'"
      >
        Registrer kort
      </button>
    </nav>

    <div class="content">
      <!-- ── Loading / Error ── -->
      <div v-if="isPending" class="loading">
        <div class="spinner"></div>
        <p>Laster statistikk...</p>
      </div>
      <div v-else-if="isError && error" class="error">
        <p>{{ error }}</p>
        <button @click="() => refetch()" class="retry-btn">Prøv igjen</button>
      </div>

      <div v-else-if="activeView === 'stats'" class="stats-container">
        <div class="section-title">Totalt antall produkter solgt</div>

        <div class="cards-grid">
          <div class="stat-card">
            <div class="card-label">Siste 7 dager</div>
            <div class="card-value">
              {{ formatNumber(totalItemsLast7Days) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Siste 30 dager</div>
            <div class="card-value">
              {{ formatNumber(totalItemsLast30Days) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Siste år</div>
            <div class="card-value">{{ formatNumber(totalItemsLastYear) }}</div>
          </div>
        </div>

        <div class="section-title" style="margin-top: 60px">
          Populære varer
        </div>

        <div class="popular-grid">
          <div class="popular-card">
            <div class="card-header">7 dager</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLast7Days"
                :key="`7d-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLast7Days.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">30 dager</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLast30Days"
                :key="`30d-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLast30Days.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">1 år</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsLastYear"
                :key="`1y-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsLastYear.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>
        </div>

        <div class="last-updated">
          Oppdatert {{ now.toLocaleString("no-NO") }}
        </div>
      </div>

      <div v-else-if="activeView === 'leaderboard'" class="stats-container">
        <div class="section-title">Toppliste</div>

        <div v-if="registrationsPending" class="loading">
          <div class="spinner"></div>
          <p>Laster toppliste...</p>
        </div>

        <div v-else class="popular-grid">
          <div class="popular-card">
            <div class="card-header">7 dager</div>
            <div class="items-list">
              <div
                v-for="(entry, idx) in leaderboard7Days"
                :key="`lb7-${idx}`"
                class="item-row"
              >
                <span class="item-rank">#{{ idx + 1 }}</span>
                <span class="item-name">{{ entry.displayName }}</span>
                <!-- purchaseCount & totalAmount available but hidden -->
                <!-- <span class="item-qty">{{ entry.purchaseCount }} kjøp</span> -->
              </div>
              <div v-if="!leaderboard7Days.length" class="empty-state">
                Ingen registrerte kjøp
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">30 dager</div>
            <div class="items-list">
              <div
                v-for="(entry, idx) in leaderboard30Days"
                :key="`lb30-${idx}`"
                class="item-row"
              >
                <span class="item-rank">#{{ idx + 1 }}</span>
                <span class="item-name">{{ entry.displayName }}</span>
              </div>
              <div v-if="!leaderboard30Days.length" class="empty-state">
                Ingen registrerte kjøp
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">1 år</div>
            <div class="items-list">
              <div
                v-for="(entry, idx) in leaderboardYear"
                :key="`lb1y-${idx}`"
                class="item-row"
              >
                <span class="item-rank">#{{ idx + 1 }}</span>
                <span class="item-name">{{ entry.displayName }}</span>
              </div>
              <div v-if="!leaderboardYear.length" class="empty-state">
                Ingen registrerte kjøp
              </div>
            </div>
          </div>
        </div>

        <div class="last-updated">
          Oppdatert {{ now.toLocaleString("no-NO") }}
        </div>
      </div>

      <div v-else-if="activeView === 'register'" class="stats-container">
        <div class="section-title">Registrer kortet ditt</div>
        <p class="register-description">
          Velg kortet du betalte med i dag, og skriv inn navnet du vil vise på
          topplisten. Bare registrerte kort vises på topplisten.
        </p>

        <!-- Success banner -->
        <div v-if="registerSuccess" class="register-success">
          Kortet er registrert! Du vises nå på topplisten.
        </div>

        <!-- Error banner -->
        <div v-if="registerError" class="register-error">
          {{ registerError }}
        </div>

        <!-- Card picker -->
        <div v-if="!selectedPan" class="card-picker">
          <div class="card-picker-header">Velg ditt kort fra dagens kjøp</div>

          <div v-if="!todaysCardPayments.length" class="empty-state">
            Ingen kortkjøp funnet i dag. Har du handlet med kort i dag?
          </div>

          <div
            v-for="card in todaysCardPayments"
            :key="card.maskedPan"
            :class="[
              'card-pick-row',
              { 'already-registered': isAlreadyRegistered(card.maskedPan) },
            ]"
            @click="
              !isAlreadyRegistered(card.maskedPan) &&
                (selectedPan = card.maskedPan)
            "
          >
            <div class="card-pick-info">
              <span class="card-pick-pan"
                >**** {{ last4(card.maskedPan) }}</span
              >
              <span v-if="card.cardType" class="card-pick-type">{{
                card.cardType
              }}</span>
            </div>
            <span
              v-if="isAlreadyRegistered(card.maskedPan)"
              class="card-pick-registered"
              >Allerede registrert</span
            >
            <span v-else class="card-pick-action">Velg</span>
          </div>
        </div>

        <!-- Name form (after card selection) -->
        <div v-else class="register-form">
          <div class="register-form-card">
            <span>Valgt kort: **** {{ last4(selectedPan) }}</span>
            <button class="change-card-btn" @click="selectedPan = null">
              Bytt
            </button>
          </div>

          <label class="register-label" for="displayName"
            >Ditt visningsnavn</label
          >
          <input
            id="displayName"
            v-model="registerName"
            type="text"
            class="register-input"
            maxlength="50"
            placeholder="Skriv navnet ditt..."
            @keyup.enter="submitRegistration"
          />

          <button
            class="register-submit-btn"
            :disabled="
              !registerName.trim() || registerMutation.isPending.value
            "
            @click="submitRegistration"
          >
            {{
              registerMutation.isPending.value
                ? "Registrerer..."
                : "Registrer"
            }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

.internal-kiosk-screen {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif !important;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0f1a2e 0%, #1a2a4e 100%);
  display: flex;
  flex-direction: column;
  overflow: auto;
}

.internal-kiosk-screen *,
.internal-kiosk-screen *::before,
.internal-kiosk-screen *::after {
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif !important;
  cursor: default !important;
}

/* ── Navigation bar ── */
.kiosk-nav {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 20px 32px 0;
  flex-shrink: 0;
}

.nav-btn {
  padding: 10px 28px;
  border-radius: 8px;
  border: 1px solid rgba(99, 150, 220, 0.3);
  background: rgba(44, 100, 200, 0.08);
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  transition: all 0.25s ease;
  cursor: pointer !important;
  outline: none;
  box-shadow: none;
}

.nav-btn:hover {
  background: rgba(44, 100, 200, 0.18);
  color: #ffffff;
  border-color: rgba(99, 150, 220, 0.5);
  cursor: pointer !important;
}

.nav-btn.active {
  background: rgba(44, 100, 200, 0.3);
  color: #ffffff;
  border-color: rgba(99, 150, 220, 0.6);
  box-shadow: 0 0 16px rgba(44, 100, 200, 0.2);
}

.close-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  z-index: 1000;
  padding: 0;
  outline: none;
  box-shadow: none;
}

.close-btn:hover {
  color: #ffffff;
  transform: rotate(90deg);
}

.content {
  flex: 1;
  padding: 32px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  overflow-y: auto;
}

.loading,
.error {
  background: rgba(26, 26, 26, 0.8);
  backdrop-filter: blur(10px);
  padding: 48px;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  text-align: center;
  color: #ffffff;
}

.spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading p,
.error p {
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  font-size: 1rem;
}

.retry-btn {
  margin-top: 24px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.retry-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.3);
}

.stats-container {
  width: 100%;
  max-width: 1600px;
}

.section-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12px;
  letter-spacing: -0.01em;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.stat-card {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.15) 0%,
    rgba(44, 100, 200, 0.05) 100%
  );
  border: 1px solid rgba(99, 150, 220, 0.3);
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.stat-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(99, 150, 220, 0.6),
    transparent
  );
}

.stat-card:hover {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.25) 0%,
    rgba(44, 100, 200, 0.1) 100%
  );
  border-color: rgba(99, 150, 220, 0.5);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(44, 100, 200, 0.15);
}

.card-label {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.6);
  font-weight: 600;
}

.card-value {
  font-size: 2.8rem;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
}

.card-products {
  border-top: 1px solid rgba(99, 150, 220, 0.2);
  padding-top: 16px;
}

.products-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  font-size: 0.9rem;
}

.product-name {
  color: rgba(255, 255, 255, 0.7);
  flex: 1;
}

.product-qty {
  color: #ffffff;
  font-weight: 600;
  margin-left: 12px;
}

.popular-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 24px;
  margin-bottom: 40px;
}

.popular-card {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.15) 0%,
    rgba(44, 100, 200, 0.05) 100%
  );
  border: 1px solid rgba(99, 150, 220, 0.3);
  border-radius: 16px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.popular-card:hover {
  background: linear-gradient(
    135deg,
    rgba(44, 100, 200, 0.25) 0%,
    rgba(44, 100, 200, 0.1) 100%
  );
  border-color: rgba(99, 150, 220, 0.5);
  box-shadow: 0 12px 40px rgba(44, 100, 200, 0.15);
}

.card-header {
  padding: 16px 24px;
  background: rgba(44, 100, 200, 0.1);
  border-bottom: 1px solid rgba(99, 150, 220, 0.3);
  font-weight: 600;
  color: #ffffff;
  font-size: 1rem;
  letter-spacing: -0.01em;
}

.items-list {
  padding: 16px 24px;
  max-height: 500px;
  overflow-y: auto;
}

.item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(99, 150, 220, 0.15);
  font-size: 0.95rem;
}

.item-row:last-child {
  border-bottom: none;
}

.item-rank {
  color: rgba(99, 150, 220, 0.9);
  font-weight: 700;
  font-size: 1rem;
  min-width: 40px;
}

.item-name {
  color: rgba(255, 255, 255, 1);
  flex: 1;
}

.item-qty {
  color: #ffffff;
  font-weight: 600;
  margin-left: 12px;
  min-width: 50px;
  text-align: right;
}

.empty-state {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 32px 0;
}

.no-data {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  padding: 24px;
  font-size: 0.95rem;
}

.last-updated {
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  padding: 24px;
  font-weight: 500;
}

/* ── Card registration view ── */

.register-description {
  color: rgba(255, 255, 255, 0.65);
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
  max-width: 700px;
}

.register-success {
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  color: #86efac;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-weight: 600;
  font-size: 0.95rem;
}

.register-error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
  padding: 16px 24px;
  border-radius: 12px;
  margin-bottom: 24px;
  font-weight: 600;
  font-size: 0.95rem;
}

.card-picker {
  max-width: 600px;
}

.card-picker-header {
  font-size: 1.05rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 16px;
}

.card-pick-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(44, 100, 200, 0.1);
  border: 1px solid rgba(99, 150, 220, 0.25);
  border-radius: 12px;
  margin-bottom: 10px;
  transition: all 0.2s ease;
  cursor: pointer !important;
}

.card-pick-row:hover:not(.already-registered) {
  background: rgba(44, 100, 200, 0.22);
  border-color: rgba(99, 150, 220, 0.5);
  transform: translateX(4px);
}

.card-pick-row.already-registered {
  opacity: 0.5;
  cursor: not-allowed !important;
}

.card-pick-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-pick-pan {
  color: #ffffff;
  font-weight: 600;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}

.card-pick-type {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-pick-action {
  color: rgba(99, 150, 220, 0.9);
  font-weight: 600;
  font-size: 0.9rem;
}

.card-pick-registered {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  font-style: italic;
}

.register-form {
  max-width: 500px;
}

.register-form-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(44, 100, 200, 0.12);
  border: 1px solid rgba(99, 150, 220, 0.3);
  border-radius: 12px;
  padding: 14px 20px;
  margin-bottom: 24px;
  color: #ffffff;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.change-card-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: 1px solid rgba(99, 150, 220, 0.4);
  background: rgba(44, 100, 200, 0.15);
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer !important;
  transition: all 0.2s ease;
}

.change-card-btn:hover {
  background: rgba(44, 100, 200, 0.3);
  color: #ffffff;
}

.register-label {
  display: block;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}

.register-input {
  width: 100%;
  padding: 14px 18px;
  border-radius: 10px;
  border: 1px solid rgba(99, 150, 220, 0.35);
  background: rgba(15, 26, 46, 0.8);
  color: #ffffff;
  font-size: 1.05rem;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  box-sizing: border-box;
  margin-bottom: 20px;
}

.register-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.register-input:focus {
  border-color: rgba(99, 150, 220, 0.7);
  box-shadow: 0 0 0 3px rgba(99, 150, 220, 0.15);
}

.register-submit-btn {
  padding: 14px 36px;
  border-radius: 10px;
  border: none;
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
  color: #ffffff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer !important;
  transition: all 0.25s ease;
  width: 100%;
  letter-spacing: 0.02em;
}

.register-submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
  transform: translateY(-2px);
}

.register-submit-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed !important;
}

/* ── Responsive ── */

@media (max-width: 1200px) {
  .cards-grid,
  .popular-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 24px 20px;
  }

  .card-value {
    font-size: 2.2rem;
  }
}

@media (max-width: 768px) {
  .content {
    padding: 24px;
  }

  .kiosk-nav {
    padding: 16px 16px 0;
    gap: 6px;
  }

  .nav-btn {
    padding: 8px 16px;
    font-size: 0.85rem;
  }

  .section-title {
    font-size: 1.3rem;
    margin-bottom: 16px;
  }

  .cards-grid,
  .popular-grid {
    gap: 16px;
    margin-bottom: 32px;
  }

  .stat-card,
  .popular-card {
    padding: 20px 16px;
  }

  .card-value {
    font-size: 2rem;
  }

  .card-header {
    padding: 12px 16px;
    font-size: 0.95rem;
  }

  .items-list {
    padding: 12px 16px;
  }

  .item-row {
    padding: 8px 0;
    font-size: 0.85rem;
  }
}
</style>
