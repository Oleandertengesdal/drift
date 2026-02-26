<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { apiClient } from "@/api/client";
import { useRouter } from "vue-router";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  isAfter,
  isEqual,
  startOfMinute,
  startOfWeek,
  startOfMonth,
  startOfYear,
} from "date-fns";
import {
  useZettleWebSocket,
  type Purchase,
} from "@/composables/useZettleWebSocket";

const router = useRouter();

const now = ref(startOfMinute(new Date()));
const startOfCurrentYear = computed(() => startOfYear(now.value));
const startOfCurrentMonth = computed(() => startOfMonth(now.value));
const startOfCurrentWeek = computed(() => startOfWeek(now.value, { weekStartsOn: 1 })); // Mandag som start

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

const startOfCurrentYearISOString = computed(() => startOfCurrentYear.value.toISOString());
const nowISOString = computed(() => now.value.toISOString());

const queryClient = useQueryClient();

const productsQuery = computed(() => {
  return queryOptions({
    queryKey: ["zettle", "purchases"],
    queryFn: () => {
      return apiClient.api.zettle.purchases
        .$get({
          query: {
            startDate: startOfCurrentYearISOString.value,
            endDate: nowISOString.value,
          },
        })
        .then((res) => res.json());
    },
  });
});

const {
  data: purchases,
  isPending,
  isError,
  error,
  refetch,
} = useQuery(productsQuery);

const showBanner = ref(false);
const latestPurchase = ref<Purchase | null>(null);
let bannerTimer: ReturnType<typeof setTimeout> | null = null;

useZettleWebSocket(({ purchase }) => {
  latestPurchase.value = purchase;
  showBanner.value = true;
  new Audio("/complete_sound.mp3").play().catch(() => {});
  if (bannerTimer) clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => {
    showBanner.value = false;
  }, 6000);
  setTimeout(() => {
    queryClient.refetchQueries(productsQuery.value);
  }, 200);
});


const yearPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, startOfCurrentYear.value) || timestamp.getTime() === startOfCurrentYear.value.getTime() : false;
  });
});

const monthPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, startOfCurrentMonth.value) || timestamp.getTime() === startOfCurrentMonth.value.getTime() : false;
  });
});

const weekPurchases = computed(() => {
  if (!purchases.value || !Array.isArray(purchases.value)) return [];
  return purchases.value.filter((p) => {
    const timestamp = parseDate(p.timestamp);
    return timestamp ? isAfter(timestamp, startOfCurrentWeek.value) || timestamp.getTime() === startOfCurrentWeek.value.getTime() : false;
  });
});

const totalItemsThisWeek = computed(() =>
  weekPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsThisMonth = computed(() =>
  monthPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const totalItemsThisYear = computed(() =>
  yearPurchases.value.reduce(
    (sum, purchase) => sum + getPurchaseItemCount(purchase),
    0,
  ),
);

const popularItemsThisWeek = computed(() =>
  buildPopularItems(weekPurchases.value),
);

const popularItemsThisMonth = computed(() =>
  buildPopularItems(monthPurchases.value),
);

const popularItemsThisYear = computed(() =>
  buildPopularItems(yearPurchases.value),
);

onMounted(() => {
  const intervalId = setInterval(() => {
    const newValue = startOfMinute(new Date());
    if (isEqual(now.value, newValue)) return;
    now.value = newValue;
    setTimeout(() => {
      queryClient.refetchQueries(productsQuery.value);
    }, 200);
  }, 1000);

  return () => clearInterval(intervalId);
});
</script>

<template>
  <div class="internal-kiosk-screen">
    <Transition name="banner">
      <div
        v-if="showBanner && latestPurchase"
        class="purchase-banner"
        @click="showBanner = false"
      >
        <div class="banner-card">
          <div class="banner-heading">Nytt kjøp!</div>
          <ul class="banner-products">
            <li
              v-for="(product, i) in latestPurchase.products"
              :key="i"
              class="banner-product-row"
            >
              <span class="banner-product-name">
                {{ product.name || product.variantName || "Ukjent produkt" }}
                <span
                  v-if="product.variantName && product.name"
                  class="banner-variant"
                  >({{ product.variantName }})</span
                >
              </span>
              <span class="banner-product-qty"
                >x {{ product.quantity ?? 1 }}</span
              >
            </li>
          </ul>
          <div v-if="latestPurchase.amount != null" class="banner-total">
            Totalt:
            {{
              new Intl.NumberFormat("no-NO", {
                style: "currency",
                currency: latestPurchase.currency || "NOK",
              }).format(latestPurchase.amount / 100)
            }}
          </div>
        </div>
      </div>
    </Transition>
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
    <div class="content">
      <div v-if="isPending" class="loading">
        <div class="spinner"></div>
        <p>Laster statistikk...</p>
      </div>
      <div v-else-if="isError && error" class="error">
        <p>{{ error }}</p>
        <button @click="() => refetch()" class="retry-btn">Prøv igjen</button>
      </div>
      <div v-else class="stats-container">

        <div class="section-title">Totalt antall produkter solgt</div>

        <div class="cards-grid">
          <div class="stat-card">
            <div class="card-label">Denne uken</div>
            <div class="card-value">
              {{ formatNumber(totalItemsThisWeek) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Denne måneden</div>
            <div class="card-value">
              {{ formatNumber(totalItemsThisMonth) }}
            </div>
          </div>

          <div class="stat-card">
            <div class="card-label">Dette året</div>
            <div class="card-value">{{ formatNumber(totalItemsThisYear) }}</div>
          </div>
        </div>

        <div class="section-title" style="margin-top: 60px">Populære varer</div>

        <div class="popular-grid">
          <div class="popular-card">
            <div class="card-header">Denne uken</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsThisWeek"
                :key="`week-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsThisWeek.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">Denne måneden</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsThisMonth"
                :key="`month-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsThisMonth.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>

          <div class="popular-card">
            <div class="card-header">Dette året</div>
            <div class="items-list">
              <div
                v-for="item in popularItemsThisYear"
                :key="`year-full-${item.name}`"
                class="item-row"
              >
                <span class="item-name">{{ item.name }}</span>
                <span class="item-qty">{{ formatNumber(item.amount) }}</span>
              </div>
              <div v-if="!popularItemsThisYear.length" class="empty-state">
                Ingen data
              </div>
            </div>
          </div>
        </div>

        <div class="last-updated">
          Oppdatert {{ now.toLocaleString("no-NO") }}
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
  background: #16213a;
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

.close-btn {
  position: fixed;
  top: 24px;
  right: 24px;
  background: transparent;
  border: none;
  color: #cccccc;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1000;
  padding: 0;
  outline: none;
  box-shadow: none;
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
  background: #1e2746;
  border: 1px solid #2d3959;
  border-radius: 10px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
  overflow: hidden;
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
  background: #1e2746;
  border: 1px solid #2d3959;
  border-radius: 10px;
  overflow: hidden;
}

.card-header {
  padding: 16px 24px;
  background: #232c4a;
  border-bottom: 1px solid #2d3959;
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

/* Purchase banner */

.purchase-banner {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  cursor: pointer;
}

.banner-card {
  background: linear-gradient(135deg, #0d3d1a 0%, #1a5c2a 100%);
  border: 2px solid #4ade80;
  border-radius: 24px;
  padding: 48px 64px;
  min-width: 420px;
  max-width: 640px;
  text-align: center;
  box-shadow:
    0 0 60px rgba(74, 222, 128, 0.35),
    0 24px 80px rgba(0, 0, 0, 0.5);
}

.banner-heading {
  font-size: 3rem;
  font-weight: 800;
  color: #4ade80;
  margin-bottom: 28px;
  letter-spacing: -0.02em;
  text-shadow: 0 0 20px rgba(74, 222, 128, 0.6);
}

.banner-products {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.banner-product-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid rgba(74, 222, 128, 0.2);
  font-size: 1.1rem;
}

.banner-product-row:last-child {
  border-bottom: none;
}

.banner-product-name {
  color: #ffffff;
  font-weight: 500;
}

.banner-variant {
  color: rgba(255, 255, 255, 0.6);
  font-weight: 400;
  font-size: 0.95em;
}

.banner-product-qty {
  color: #4ade80;
  font-weight: 700;
  margin-left: 16px;
}

.banner-total {
  font-size: 1.4rem;
  font-weight: 700;
  color: #ffffff;
  padding-top: 16px;
  border-top: 1px solid rgba(74, 222, 128, 0.3);
}

/* Vue Transition */
.banner-enter-active {
  animation: banner-in 0.35s ease;
}

.banner-leave-active {
  animation: banner-out 0.25s ease;
}

@keyframes banner-in {
  from {
    opacity: 0;
    transform: scale(0.88) translateY(24px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@keyframes banner-out {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0;
    transform: scale(0.92) translateY(-16px);
  }
}
</style>
